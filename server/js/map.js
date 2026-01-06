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

// map.on('load', () => {
//     map.addSource('hillshade', {
//         type: 'raster', // 'raster' for image tiles
//         tiles: [
//             'http://gilfoyle.bk.tudelft.nl:8080/hillshade_dtm.pmtiles/{z}/{x}/{y}.png'
//         ],
//         tileSize: 256
//     });

//     map.addLayer({
//         id: 'hillshade-layer',
//         type: 'raster',  // 'raster' shows the image
//         source: 'hillshade',
//         paint: {
//             'raster-opacity': 0.7
//         }
//     });
// });


// Add administrative boundaries layer (Bestuurlijke Gebieden)
// map.on('load', () => {
//     fetch('https://api.pdok.nl/kadaster/bestuurlijkegebieden/ogc/v1/styles/bestuurlijkegebieden_standaardvisualisatie__webmercatorquad?f=mapbox')
//         .then(response => response.json())
//         .then(style => {
//             // Add sources defined in the style
//             Object.entries(style.sources).forEach(([id, source]) => {
//                 if (!map.getSource(id)) map.addSource(id, source);
//             });
//             // Add layers defined in the style
//             style.layers.forEach(layer => {
//                 // Skip background layers to avoid covering the base map
//                 if (layer.type !== 'background' && !map.getLayer(layer.id)) {
//                     map.addLayer(layer);
//                 }
//             });
//         })
//         .catch(error => console.error('Error loading administrative style:', error));
// });
