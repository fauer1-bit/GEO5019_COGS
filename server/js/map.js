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