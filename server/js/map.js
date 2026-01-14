import maplibregl from 'https://esm.sh/maplibre-gl@4.7.1';
import * as pmtiles from 'https://esm.sh/pmtiles@3.0.3';

// Define map. Style it with achtergrondkaart from the kadaster
window.map = new maplibregl.Map({ 
    container: 'map', 
    style: 'https://api.pdok.nl/kadaster/brt-achtergrondkaart/ogc/v1/styles/standaard__webmercatorquad', 
    center: [5., 52.15], 
    zoom: 6.8
});
// Add controls for navigation to map
map.addControl(new maplibregl.NavigationControl()); map.addControl(new maplibregl.ScaleControl());
// Listen events.Display lat/lon in the console when clicking
map.on('click', (e) => {console.log(e.lngLat); });

const protocol = new pmtiles.Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);
const PMTILES_DTM_URL = 'http://localhost:5000/hillshade_dtm.pmtiles';
map.on('load', () => {
    map.addSource('hillshade-dtm', {
        type: 'raster',
        url: `pmtiles://${PMTILES_DTM_URL}`,
        tileSize: 256
    });
});

const PMTILES_DSM_URL = 'http://localhost:5000/hillshade_dsm.pmtiles';
map.on('load', () => {
    map.addSource('hillshade-dsm', {
        type: 'raster',
        url: `pmtiles://${PMTILES_DSM_URL}`,
        tileSize: 256
    });
});

// Create function to enable/disable DTM layer
const layer1_input = document.getElementById('layer1');
layer1_input.addEventListener('change', () => {
    if (layer1_input.checked && !map.getLayer('hillshade-dtm-layer')) {
        const beforeId = map.getLayer('municipality-outline') ? 'municipality-outline' : undefined;
        map.addLayer({
            id: 'hillshade-dtm-layer',
            type: 'raster', 
            source: 'hillshade-dtm'
        }, beforeId)
        // Display opacity range bar
        const opacity_layer1 = document.createElement('input');
        opacity_layer1.type = 'range';
        opacity_layer1.min = '0';
        opacity_layer1.max = '1';
        opacity_layer1.step = '0.01';
        opacity_layer1.value = '1';
        opacity_layer1.id = 'opacity_layer1';
        opacity_layer1.addEventListener('input', (e) => {
            const opacity1 = parseFloat(e.target.value);
            map.setPaintProperty('hillshade-dtm-layer', 'raster-opacity', opacity1);
        })
        layer1_input.after(opacity_layer1);

    } else {
        if (map.getLayer('hillshade-dtm-layer')) map.removeLayer('hillshade-dtm-layer');
        const el = document.getElementById('opacity_layer1');
        if (el) el.remove();
    }
})

// Create function to enable/disable DSM layer
const layer2_input = document.getElementById('layer2');
layer2_input.addEventListener('change', () => {
    if (layer2_input.checked && !map.getLayer('hillshade-dsm-layer')) {
        const beforeId = map.getLayer('municipality-outline') ? 'municipality-outline' : undefined;
        map.addLayer({
            id: 'hillshade-dsm-layer',
            type: 'raster', 
            source: 'hillshade-dsm'
        }, beforeId)
        // Display opacity range bar
        const opacity_layer2 = document.createElement('input');
        opacity_layer2.type = 'range';
        opacity_layer2.min = '0';
        opacity_layer2.max = '1';
        opacity_layer2.step = '0.01';
        opacity_layer2.value = '1';
        opacity_layer2.id = 'opacity_layer2';
        opacity_layer2.addEventListener('input', (e) => {
            const opacity2 = parseFloat(e.target.value);
            map.setPaintProperty('hillshade-dsm-layer', 'raster-opacity', opacity2);
        })
        layer2_input.after(opacity_layer2);
    } else {
        if (map.getLayer('hillshade-dsm-layer')) map.removeLayer('hillshade-dsm-layer');
        const el = document.getElementById('opacity_layer2');
        if (el) el.remove();
    }
})
