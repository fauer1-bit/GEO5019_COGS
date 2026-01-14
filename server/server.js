import express from 'express';
import duckdb from 'duckdb';
import cors from 'cors';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import proj4 from 'proj4';
import { extractBboxAsBuffer } from './utils/gdalExtractor.js';
import { getCogPath } from './config/cogConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
// Serve static files (index.html, css, js) from the current directory
app.use(express.static(__dirname));


// Define RD New projection (EPSG:28992) - Dutch national coordinate system
// This is the CRS used by the COGs
proj4.defs('EPSG:28992', '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs');

/**
 * Transform coordinates from WGS84 (EPSG:4326) to RD New (EPSG:28992)
 * MapLibre uses WGS84, but the COGs are in EPSG:28992
 * 
 * @param {number} lon - Longitude in WGS84
 * @param {number} lat - Latitude in WGS84
 * @returns {Array} - [x, y] in EPSG:28992
 */
function transformWGS84ToRDNew(lon, lat) {
    return proj4('EPSG:4326', 'EPSG:28992', [lon, lat]);
}

// Open boundaries_database.db
const dbPath = 'boundaries_database.db';
const absolutePath = path.resolve(__dirname, dbPath);
console.log(absolutePath)

console.log(`Connecting to database at: ${absolutePath}`);
if (!fs.existsSync(absolutePath)) {
    console.error(`ERROR: Database file not found at ${absolutePath}`);
} else {
    const stats = fs.statSync(absolutePath);
    console.log(`Database file found. Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

const db = new duckdb.Database(absolutePath);
db.exec(`
  INSTALL spatial;
  LOAD spatial;
  INSTALL httpfs;
  LOAD httpfs;
`);

// Create endpoint to request municipality polygons 
app.post('/getPolygon', (req, res) => {
    const { name } = req.body;
    console.log(`Requesting polygon for: ${name}`);

    if (!name) {
        return res.status(400).json({ error: "Name parameter is required" });
    }

    db.all(`
        SELECT ST_AsGeoJSON(geometry) as geometry 
        FROM municipality_boundaries 
        WHERE name ILIKE '%' || ? || '%'
        LIMIT 1
    `, name, (err, rows) => {
        if(err) {
            console.error("Database error:", err);
            return res.status(500).json({error: err.message});
        }
        
        // console.log(`DB Query found ${rows.length} rows for '${name}'`);
        if(rows.length === 0) return res.status(404).json({error: 'Municipality not found'});

        try {
            const geometryGeoJSON = JSON.parse(rows[0].geometry);
            // console.dir(geometryGeoJSON, { depth: null, colors: true });
            return res.json(geometryGeoJSON);
        } catch (e) {
            console.error("Error parsing geometry:", e);
            res.status(500).json({ error: "Failed to parse geometry" });
        }
    });
});

// Create endpoint to handle bounding box download requests
// This endpoint extracts a bbox region from local COG files
app.post('/downloadBbox', async (req, res) => {
    try {
        const { x1, y1, x2, y2, product, resolution } = req.body;
        console.log(`Download requested: ${product} ${resolution} [${x1}, ${y1}, ${x2}, ${y2}]`);

        // Validate inputs
        if (!x1 || !y1 || !x2 || !y2 || !product || !resolution) {
            return res.status(400).json({
                error: "Missing required parameters. Need: x1, y1, x2, y2, product, resolution"
            });
        }

        // Validate product type
        if (product !== 'DTM' && product !== 'DSM') {
            return res.status(400).json({
                error: "Invalid product type. Must be 'DTM' or 'DSM'"
            });
        }

        // Validate resolution
        const validResolutions = ['0.5 m', '1.0 m', '2.0 m', '4.0 m', '8.0 m', '16.0 m', '32.0 m'];
        if (!validResolutions.includes(resolution)) {
            return res.status(400).json({
                error: `Invalid resolution. Must be one of: ${validResolutions.join(', ')}`
            });
        }

        // Get local COG file path
        const cogPath = getCogPath(product);

        // Verify file exists
        if (!fs.existsSync(cogPath)) {
            return res.status(404).json({
                error: `${product} COG file not found at ${cogPath}`
            });
        }

        // Parse and validate coordinates (these are in WGS84 from MapLibre)
        const bboxWGS84 = {
            x1: parseFloat(x1),
            y1: parseFloat(y1),
            x2: parseFloat(x2),
            y2: parseFloat(y2)
        };

        // Check for NaN
        if (isNaN(bboxWGS84.x1) || isNaN(bboxWGS84.y1) || isNaN(bboxWGS84.x2) || isNaN(bboxWGS84.y2)) {
            return res.status(400).json({
                error: "Invalid coordinates. All bbox values must be valid numbers."
            });
        }

        // Check that bbox has area
        if (bboxWGS84.x1 === bboxWGS84.x2 || bboxWGS84.y1 === bboxWGS84.y2) {
            return res.status(400).json({
                error: "Invalid bounding box. Box must have non-zero area."
            });
        }

        // Transform coordinates from WGS84 (EPSG:4326) to RD New (EPSG:28992)
        // MapLibre map uses WGS84, but COGs are in EPSG:28992
        console.log(`Input bbox (WGS84): [${bboxWGS84.x1}, ${bboxWGS84.y1}, ${bboxWGS84.x2}, ${bboxWGS84.y2}]`);

        const [x1_rd, y1_rd] = transformWGS84ToRDNew(bboxWGS84.x1, bboxWGS84.y1);
        const [x2_rd, y2_rd] = transformWGS84ToRDNew(bboxWGS84.x2, bboxWGS84.y2);

        const bbox = {
            x1: x1_rd,
            y1: y1_rd,
            x2: x2_rd,
            y2: y2_rd
        };

        console.log(`Transformed bbox (EPSG:28992): [${bbox.x1.toFixed(2)}, ${bbox.y1.toFixed(2)}, ${bbox.x2.toFixed(2)}, ${bbox.y2.toFixed(2)}]`);

        console.log(`Extracting bbox from ${cogPath}...`);

        // Extract bbox region from COG using GDAL
        // This uses local file I/O and GDAL's -projwin for bbox extraction
        const tiffBuffer = await extractBboxAsBuffer(cogPath, bbox, resolution);

        // Set response headers for GeoTIFF download
        res.set({
            'Content-Type': 'image/tiff',
            'Content-Disposition': `attachment; filename="${product}_${resolution}_${x1}_${y1}_${x2}_${y2}.tif"`,
            'Content-Length': tiffBuffer.length
        });

        // Send the GeoTIFF buffer
        console.log(`Sending ${(tiffBuffer.length / 1024).toFixed(2)} KB GeoTIFF to client`);
        res.send(tiffBuffer);

    } catch (error) {
        console.error('Error processing bbox request:', error);
        res.status(500).json({
            error: `Failed to extract bounding box: ${error.message}`
        });
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
