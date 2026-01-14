import { queryPointsTool } from './query_points.js';
import { queryPolylineTool } from './query_polyline.js';
import { queryBboxTool } from './query_bbox.js';
import { queryPlaceTool } from './query_place.js';
import {queryDataset} from './query_data.js';

// Check if COG protocol was registered (done in index.html before map.js)
if (window.cogProtocolRegistered) {
  console.log("main.js: COG protocol is available");
} else {
  console.warn("main.js: COG protocol was not registered - COG layers will not work");
}


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

// DSM COG layer toggle
const dsmCheckbox = document.getElementById("layerDSM");

function addDsmCogLayer() {
  const map = window.map;
  if (!map) return;

  if (!map.getSource("dsm-cog")) {
    map.addSource("dsm-cog", {
      type: "raster",
      tiles: ["cog://http://localhost:3000/data/dsm/dsm_sample_05m_cog_3857.tif"],
      tileSize: 512
    });
  }

  if (!map.getLayer("dsm-layer")) {
    map.addLayer({
      id: "dsm-layer",
      type: "raster",
      source: "dsm-cog",
      paint: { "raster-opacity": 0.8 }
    });
  }
}

function removeDsmCogLayer() {
  const map = window.map;
  if (!map) return;

  if (map.getLayer("dsm-layer")) map.removeLayer("dsm-layer");
  if (map.getSource("dsm-cog")) map.removeSource("dsm-cog");
}

// Wait until the map is fully loaded before touching sources/layers
function whenMapReady(fn) {
  const map = window.map;
  if (!map) return console.warn("window.map not found (map.js not loaded?)");

  if (map.loaded()) fn();
  else map.once("load", fn);
}

if (dsmCheckbox) {
  dsmCheckbox.addEventListener("change", (e) => {
    whenMapReady(() => {
      if (e.target.checked) addDsmCogLayer();
      else removeDsmCogLayer();
    });
  });
} else {
  console.warn("Checkbox #layerDSM not found in DOM.");
}