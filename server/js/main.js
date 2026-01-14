import { queryBboxTool } from './query_bbox.js';
import { queryPlaceTool } from './query_place.js';

// Set tool boxes to null when loading the website
let queryBboxToolBox = null;
let queryPlaceToolBox = null;

// Define target icons to trigger tools
const queryBbox = document.getElementById('queryBbox');
const queryPlace = document.getElementById('queryPlace');

// Trigger tools when target icons are clicked (returns tool box and geometry queries in TXT files)
queryBbox.addEventListener('click', () => {
    queryBboxToolBox= queryBboxTool(queryBboxToolBox, [queryPlaceToolBox])
});
queryPlace.addEventListener('click', () => {
    queryPlaceToolBox = queryPlaceTool(queryPlaceToolBox, [queryBboxToolBox])
});

