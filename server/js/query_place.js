
// Function to fetch municipality polygon
async function fetchPolygonFromServer(name) {
    const response = await fetch('/getPolygon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    console.log("Fetch response status:", response.status);
    if(!response.ok) {
        const error = await response.json();
        console.error("Server error:", error);
        alert(error.error);
        return null;
    }

    const data = await response.json();
    console.log("Received polygon data:", data);
    console.log("Full JSON:", JSON.stringify(data, null, 2));
    // Return full GeoJSON geometry
    return data;
}

function GeoJSONWebMercator(geojson) {
    // Ensure proj4 is available globally
    if (typeof window.proj4 === 'undefined') {
        console.error("Proj4 is not loaded. Please add <script src='https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.9.0/proj4.js'></script> to your HTML.");
        return geojson;
    }
    const proj4 = window.proj4;

    // Define projections
    const RD_NEW = '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +no_defs';
    const WGS84 = 'EPSG:4326';

    // Recursively convert coordinates
    function convertCoordinates(coords) {
        if (typeof coords[0] === 'number') {
            // single point [x, y]
            return proj4(RD_NEW, WGS84, coords);
        } else {
            // nested array (ring, polygon, multipolygon)
            return coords.map(convertCoordinates);
        }
    }

    // Return new GeoJSON with converted coordinates
    return {
        ...geojson,
        coordinates: convertCoordinates(geojson.coordinates)
    };
}

export function queryPlaceTool(box, other_boxes) {
     // Function to toggle tool box
    const toggleBox = function (b, others) {
        // Close other boxes if active
        others.forEach(other => {
        if (other && document.body.contains(other)){
            document.body.removeChild(other);
            // Remove map click listener if it exists (e.g. from query_points)
            if (other._clickListener) {
                map.off('click', other._clickListener);
            }
            if (other._moveListener) map.off('mousemove', other._moveListener);
            if (other._keyListener) document.removeEventListener('keydown', other._keyListener);

            if (map.getLayer('draw-line-layer')) map.removeLayer('draw-line-layer');
            if (map.getSource('draw-line-source')) map.removeSource('draw-line-source');

            map.getCanvas().style.cursor = '';
            // Remove all markers from query_points tool
            other.querySelectorAll('.inputsRow').forEach(row => {
                if (row._marker) {
                    row._marker.remove();
                }
            });
        }
        })
        // If the box is already open, close it when clicked
        if (b && document.body.contains(b)){
            document.body.removeChild(b);
            // Remove existing layer/source if they exist
            if (map.getLayer('municipality-outline')) map.removeLayer('municipality-outline');
            if (map.getSource('municipality')) map.removeSource('municipality');
            return null
        } 
        // Otherwise, display toolbox
        else {
            // Create box
            box = document.createElement('div');
            box.classList.add('coordinatesBox');
            const boxTitle = document.createElement('div');
            boxTitle.classList.add('boxTitle');
            boxTitle.textContent = "Query Place";
            box.appendChild(boxTitle);
            // Create a search input
            const searchContainer = document.createElement('div');
            searchContainer.classList.add('searchContainer');
            const searchInput = document.createElement('input');
            searchInput.type = "text";
            searchInput.placeholder = "Ex. Delft";
            searchInput.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter' && searchInput.value){
                    try {
                        // Activate function to fetch municipality polygon
                        console.log("User pressed Enter. Searching for:", searchInput.value);
                        const adminName = searchInput.value; 
                        // Fetch geojson polygon from server
                        const geojson = await fetchPolygonFromServer(adminName);
                        console.log("Fetched GeoJSON:", geojson);
                        if(!geojson) return;
                        // Convert to WGS84 polygon (MapLibre expects WGS84 for GeoJSON sources)
                        const geojsonWGS84 = GeoJSONWebMercator(geojson);
                        // Display polygon on map
                        // Remove existing layer/source if they exist
                        if (map.getLayer('municipality-outline')) map.removeLayer('municipality-outline');
                        if (map.getSource('municipality')) map.removeSource('municipality');

                        // Add the polygon as a GeoJSON source
                        map.addSource('municipality', {
                            type: 'geojson',
                            data: geojsonWGS84
                        });
                        // Optional: Add a border line around the polygon
                        map.addLayer({
                            id: 'municipality-outline',
                            type: 'line',
                            source: 'municipality',
                            paint: {
                                'line-color': '#FF0000',
                                'line-width': 2
                            }
                        });

                        // Zoom map to the polygon to visually verify it
                        const bounds = new window.maplibregl.LngLatBounds();
                        const extendBounds = (coords) => {
                            if (typeof coords[0] === 'number') bounds.extend(coords);
                            else coords.forEach(extendBounds);
                        };
                        extendBounds(geojsonWGS84.coordinates);
                        map.fitBounds(bounds, { padding: 50 });
                    } catch (error) {
                        console.error("Error in search handler:", error);
                    }
                }
            });

            searchContainer.appendChild(searchInput);
            box.appendChild(searchContainer);
            // Insert box in document
            document.body.appendChild(box);
        }
        return box;
    };
    
    let adminName = null;
    let wkt = null;
    let polygon = null;
    
    // Toggle box
    box = toggleBox(box, other_boxes);
    return { box, query: null };
}
