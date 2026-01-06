import { queryPointsTool } from './query_points.js';
import { queryPolylineTool } from './query_polyline.js';
import { queryBboxTool } from './query_bbox.js';
import { queryPlaceTool } from './query_place.js';
import {queryDataset} from './query_data.js';

// Set tool boxes to null when loading the website
let queryPointsToolBox = null;
let queryPolylineToolBox = null;
let queryBboxToolBox = null;
let queryPlaceToolBox = null;

// Set query to null when loading the webiste
let query = null;

// Define target icons to trigger tools
const queryPoints = document.getElementById('queryPoints');
const queryPolyline = document.getElementById('queryPolyline');
const queryBbox = document.getElementById('queryBbox');
const queryPlace = document.getElementById('queryPlace');

// Trigger tools when target icons are clicked (returns tool box and geometry queries in TXT files)
queryPoints.addEventListener('click', () => {
    const result = queryPointsTool(queryPointsToolBox, [queryPolylineToolBox, queryBboxToolBox, queryPlaceToolBox])
    queryPointsToolBox = result.box;
    query = result.query;
    // If `query` is not null, queries the dataset and downloads a raster file
    if (query) { queryDataset(query) };
});
queryPolyline.addEventListener('click', () => {
    const result = queryPolylineTool(queryPolylineToolBox, [queryPointsToolBox, queryBboxToolBox, queryPlaceToolBox])
    queryPolylineToolBox = result.box;
    query = result.query;
    if (query) { queryDataset(query) };
});
queryBbox.addEventListener('click', () => {
    const result = queryBboxTool(queryBboxToolBox, [queryPointsToolBox, queryPolylineToolBox, queryPlaceToolBox])
    queryBboxToolBox = result.box
    query = result.query
    if (query) { queryDataset(query) };
});
queryPlace.addEventListener('click', () => {
    const result = queryPlaceTool(queryPlaceToolBox, [queryPointsToolBox, queryPolylineToolBox, queryBboxToolBox])
    queryPlaceToolBox = result.box
    query = result.query
    if (query) { queryDataset(query) };
});
