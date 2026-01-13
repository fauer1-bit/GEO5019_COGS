import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for COG file locations
// Files are stored locally on the server alongside the scripts
export const COG_CONFIG = {
    baseDir: path.resolve(__dirname, '../../testCOG'),
    files: {
        DTM: 'DTM_outputtest_COG.TIF',
        DSM: 'DSM_outputtest_COG.tif'
    }
};

/**
 * Gets the local COG file path based on product type
 * 
 * @param {string} product - Either 'DTM' or 'DSM'
 * @returns {string} - Full path to local COG file
 */
export function getCogPath(product) {
    const filePath = path.join(COG_CONFIG.baseDir, COG_CONFIG.files[product]);
    console.log(`Using local COG: ${filePath}`);
    return filePath;
}

export default {
    getCogPath,
    COG_CONFIG
};
