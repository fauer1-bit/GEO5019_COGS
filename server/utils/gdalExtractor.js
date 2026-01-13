import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get GDAL paths from environment (loaded by server.js)
const GDAL_BIN_PATH = process.env.GDAL_BIN_PATH;
const GDAL_DATA = process.env.GDAL_DATA;

// Determine the gdal_translate executable path
let gdalTranslatePath = 'gdal_translate'; // Default: assume it's in PATH, (for testing locally on laptop.)

if (GDAL_BIN_PATH) {
    // Use the full path from environment variable
    gdalTranslatePath = path.join(GDAL_BIN_PATH, 'gdal_translate.exe');
    console.log(`Using GDAL from: ${gdalTranslatePath}`);

    // Verify it exists
    if (!fs.existsSync(gdalTranslatePath)) {
        console.warn(`GDAL not found at ${gdalTranslatePath}, falling back to system PATH`);
        gdalTranslatePath = 'gdal_translate';
    }
}

// Set GDAL_DATA environment variable if specified
if (GDAL_DATA && !process.env.GDAL_DATA) {
    process.env.GDAL_DATA = GDAL_DATA;
}

/**
 * Maps resolution string to target resolution for GDAL
 * This determines which overview level to use
 */
function getTargetResolution(requestedResolution) {
    const resMap = {
        '0.5 m': '0.5',
        '1.0 m': '1',
        '2.0 m': '2',
        '4.0 m': '4',
        '8.0 m': '8',
        '16.0 m': '16',
        '32.0 m': '32'
    };
    return resMap[requestedResolution] || '1';
}

/**
 * Extracts a bounding box region from a local COG using GDAL gdal_translate
 * 
 * This approach:
 * - Uses GDAL's native bbox extraction (-projwin)
 * - Automatically handles geo metadata (CRS, transform, etc.)
 * - Supports local COG files
 * - Can output as COG or regular GeoTIFF
 * - Handles overview/resolution selection via -tr flag
 * 
 * @param {string} inputPath - Path to local COG file
 * @param {Object} bbox - {x1, y1, x2, y2} coordinates in source CRS
 * @param {string} resolution - Requested resolution (e.g., "0.5 m")
 * @returns {Promise<string>} - Path to temporary output file
 */
export async function extractBboxWithGDAL(inputPath, bbox, resolution) {
    return new Promise((resolve, reject) => {
        // Create temporary output file
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const timestamp = Date.now();
        const outputPath = path.join(tempDir, `bbox_extract_${timestamp}.tif`);

        // Get target resolution for overview selection
        const targetRes = getTargetResolution(resolution);

        // Ensure proper bbox coordinate ordering for -projwin
        // -projwin format: ulx uly lrx lry (upper-left-x, upper-left-y, lower-right-x, lower-right-y)
        // Which translates to: minX maxY maxX minY (since Y increases northward in most projected CRS)
        const minX = Math.min(bbox.x1, bbox.x2);
        const maxX = Math.max(bbox.x1, bbox.x2);
        const minY = Math.min(bbox.y1, bbox.y2);
        const maxY = Math.max(bbox.y1, bbox.y2);

        // Build gdal_translate command
        const args = [
            inputPath,
            outputPath,
            '-projwin', minX.toString(), maxY.toString(), maxX.toString(), minY.toString(),
            '-tr', targetRes, targetRes,  // Target resolution (uses appropriate overview)
            '-of', 'GTiff',  // Output format
            '-co', 'COMPRESS=LZW',  // Compression
            '-co', 'TILED=YES',  // Tiled output
            '-co', 'BLOCKXSIZE=256',
            '-co', 'BLOCKYSIZE=256'
        ];

        console.log(`Running gdal_translate with args:`, args.join(' '));

        // Spawn gdal_translate process using the configured path
        const gdal = spawn(gdalTranslatePath, args);

        let stderr = '';
        let stdout = '';

        gdal.stdout.on('data', (data) => {
            stdout += data.toString();
            console.log(`GDAL stdout: ${data}`);
        });

        gdal.stderr.on('data', (data) => {
            stderr += data.toString();
            // GDAL writes progress to stderr, which is normal
            console.log(`GDAL stderr: ${data}`);
        });

        gdal.on('close', (code) => {
            if (code !== 0) {
                console.error(`gdal_translate failed with code ${code}`);
                console.error(`stderr: ${stderr}`);
                reject(new Error(`gdal_translate failed: ${stderr}`));
                return;
            }

            // Verify output file was created
            if (!fs.existsSync(outputPath)) {
                reject(new Error('gdal_translate completed but output file not found'));
                return;
            }

            const stats = fs.statSync(outputPath);
            console.log(`Created GeoTIFF: ${outputPath} (${(stats.size / 1024).toFixed(2)} KB)`);

            resolve(outputPath);
        });

        gdal.on('error', (err) => {
            reject(new Error(`Failed to spawn gdal_translate: ${err.message}. Is GDAL installed?`));
        });
    });
}

/**
 * Extracts bbox and returns as a buffer, then cleans up temp file
 * 
 * @param {string} inputPath - Path to local COG file
 * @param {Object} bbox - {x1, y1, x2, y2} coordinates
 * @param {string} resolution - Requested resolution
 * @returns {Promise<Buffer>} - GeoTIFF file as buffer
 */
export async function extractBboxAsBuffer(inputPath, bbox, resolution) {
    let tempFile = null;

    try {
        // Extract to temp file
        tempFile = await extractBboxWithGDAL(inputPath, bbox, resolution);

        // Read file into buffer
        const buffer = fs.readFileSync(tempFile);

        return buffer;

    } finally {
        // Clean up temp file
        if (tempFile && fs.existsSync(tempFile)) {
            try {
                fs.unlinkSync(tempFile);
                console.log(`Cleaned up temp file: ${tempFile}`);
            } catch (err) {
                console.warn(`Failed to delete temp file ${tempFile}:`, err.message);
            }
        }
    }
}
