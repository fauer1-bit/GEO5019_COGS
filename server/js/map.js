import maplibregl from 'maplibre-gl';
import * as pmtiles from 'pmtiles';

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
        map.addLayer({
            id: 'hillshade-dtm-layer',
            type: 'raster', 
            source: 'hillshade-dtm'
        })
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
        map.removeLayer('hillshade-dtm-layer');
        opacity_layer1.remove();
    }
})

// Create function to enable/disable DSM layer
const layer2_input = document.getElementById('layer2');
layer2_input.addEventListener('change', () => {
    if (layer1_input.checked && !map.getLayer('hillshade-dsm-layer')) {
        map.addLayer({
            id: 'hillshade-dsm-layer',
            type: 'raster', 
            source: 'hillshade-dsm'
        })
    } else {
        map.removeLayer('hillshade-dsm-layer');
        opacity_layer2.remove();
    }
})

