import express from 'express';
import duckdb from 'duckdb';
import cors from 'cors';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
// Serve static files (index.html, css, js) from the current directory
app.use(express.static(__dirname));

// Open boundaries_database.db
const dbPath = 'boundaries_database.db';
const absolutePath = path.resolve(__dirname, dbPath);

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

db.all("SHOW TABLES", (err, rows) => {
    if (err) {
        console.error("Error listing tables:", err);
        return;
    }
    console.log("Tables in DB:", rows);
    const tableExists = rows.some(r => r.name === 'municipality_boundaries');
    if (tableExists) {
        console.log("Table 'municipality_boundaries' exists.");
        db.all("DESCRIBE municipality_boundaries", (err, cols) => {
            if (!err) console.log("Columns:", cols.map(c => c.column_name));
        });
    } else {
        console.error("ERROR: Table 'municipality_boundaries' NOT found!");
    }
});

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
        WHERE name ILIKE ?
        LIMIT 1
    `, name, (err, rows) => {
        if(err) {
            console.error("Database error:", err);
            return res.status(500).json({error: err.message});
        }
        
        console.log(`DB Query found ${rows.length} rows for '${name}'`);
        if(rows.length === 0) return res.status(404).json({error: 'Municipality not found'});

        try {
            const geometryGeoJSON = JSON.parse(rows[0].geometry);
            console.dir(geometryGeoJSON, { depth: null, colors: true });
            return res.json(geometryGeoJSON);
        } catch (e) {
            console.error("Error parsing geometry:", e);
            res.status(500).json({ error: "Failed to parse geometry" });
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
