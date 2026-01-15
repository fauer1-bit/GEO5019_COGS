import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for COG file locations (currently on my laptop (frederick))
// change here these file paths to where the files will be stored on server. 
export const COG_CONFIG = {
    baseDir: path.resolve(__dirname, '../../cogs'), // <<<<<<<<----------
    files: {
        DTM: 'dtm_ahn56_05m.tif',  // <<<<<<<<----------
        DSM: 'dsm_ahn56_05m.tif' // <<<<<<<<----------
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

