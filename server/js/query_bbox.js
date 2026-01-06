export function queryBboxTool (box, other_boxes) {
    let file = null;
    let query = null;

    // Function to toggle tool box
    const toggleBox = function (b, others) {
        // Close other boxes if active
        others.forEach(other => {
        if (other && document.body.contains(other)){
            document.body.removeChild(other);
            // Remove layers from query_place tool
            if (map.getLayer('municipality-outline')) map.removeLayer('municipality-outline');
            if (map.getSource('municipality')) map.removeSource('municipality');
            // Remove layers and listeners from query_polyline tool
            if (map.getLayer('draw-line-layer')) map.removeLayer('draw-line-layer');
            if (map.getSource('draw-line-source')) map.removeSource('draw-line-source');
            if (other._clickListener) map.off('click', other._clickListener);
            if (other._moveListener) map.off('mousemove', other._moveListener);
            if (other._keyListener) document.removeEventListener('keydown', other._keyListener);
        }
        })
        // If the box is already open, close it when clicked
        if (b && document.body.contains(b)){
            document.body.removeChild(b);
            // Remove map click listener so the map stops trying to create markers
            if (b._clickListener) {
                map.off('click', b._clickListener);
            }
            map.getCanvas().style.cursor = '';
            // Remove all markers
            b.querySelectorAll('.inputsRow').forEach(row => {
                if (row._marker) {
                    row._marker.remove();
                }
            });

            return null
        } 
        // Otherwise, display toolbox
        else {
            // Create box
            box = document.createElement('div');
            box.classList.add('coordinatesBox');
            const boxTitle = document.createElement('div');
            boxTitle.classList.add('boxTitle');
            boxTitle.textContent = "Query Bounding Box";
            box.appendChild(boxTitle);
            document.body.appendChild(box);

            // Activate drawing tool
            let points = [];
            let active = true;
            let activeRow = null;

            const sourceId = 'draw-bbox-source';
            const layerId = 'draw-bbox-layer';

            map.getCanvas().style.cursor = 'crosshair';

            map.addSource(sourceId, {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: { type: 'Polygon', coordinates: [] }
                }
            });

            map.addLayer({
                id: layerId,
                type: 'polygon',
                source: sourceId,
                paint: {
                    'line-color': '#ff0000',
                    'line-width': 3,
                    'line-dasharray': [2, 2] // preview style
                }
            });

            // Function to activate inputs row of a point
            const activateInputsRow = function (irow) {
                // Remove active style from row if row clicked again. Reset activeRow. Reset activeMarker. Reset cursor to normal.
                if (activeRow === irow) {
                    irow.classList.remove('active');
                    activeRow = null;
                    map.getCanvas().style.cursor = '';
                    return;
                }
                // Remove active style from row if escape key pressed. Reset activeRow. Reset activeMarker. Reset cursor to normal.
                document.addEventListener('keydown', (e) => {
                    if (e.key == 'Escape' && activeRow) {
                        activeRow.classList.remove('active');
                        activeRow = null;
                        map.getCanvas().style.cursor = '';
                        return;
                    }
                })
                // Remove active style from all rows first
                document.querySelectorAll('.inputsRow').forEach(r => r.classList.remove('active'));
                // Add active style to selected row and reassign activeRow
                irow.classList.add('active');
                activeRow = irow;

                // Change cursor type when a row is active
                if (activeRow){
                    map.getCanvas().style.cursor = 'crosshair';
                } 
            }

            // Define map click listener
            const onMapClick = (e) => {
                // Do nothing if no row is active
                if (!activeRow) return;
                // Extract lon and lat from clicked location
                const { lng, lat } = e.lngLat;
                // Fill inputs of lat, lon of the active row
                const inputLon = activeRow.querySelector('input:nth-child(1)'); 
                const inputLat = activeRow.querySelector('input:nth-child(2)'); 
                inputLon.value = lng.toFixed(6);
                inputLat.value = lat.toFixed(6);

                // Automatically add a new point if the active row is the last one and the amounts of rows is less than 2
                const rows = box.querySelectorAll('.inputsRow');
                if (activeRow === rows[rows.length - 1] && rows.length < 2) {
                    newPoint(box);
                }
            };
            const newPoint = function (b, lon, lat) {
                // Count number of rows in the box
                const pointNumber = b.querySelectorAll('.inputsRow').length + 1;
                // Create new inputs row
                const newInputsRow = document.createElement('div');
                newInputsRow.classList.add('inputsRow');
                // Display point name
                newInputsRow.textContent = `Point ${pointNumber}`;
                // Create input for longitude
                const inputEast = document.createElement('input');
                inputEast.type = "number";
                inputEast.step = "any";
                inputEast.min = "-180";
                inputEast.max = "180";
                inputEast.placeholder = "E"
                if (lon !== undefined) inputEast.value = lon.toFixed(6);
                // Create input for latitude
                const inputNorth = document.createElement('input');
                inputNorth.type = "number";
                inputNorth.step = "any";
                inputNorth.min = "-90";
                inputNorth.max = "90";
                inputNorth.placeholder = "N";
                if (lat !== undefined) inputNorth.value = lat.toFixed(6);

                // Update line when inputs change
                const updateCoords = () => {
                    const lng = parseFloat(inputEast.value);
                    const lat = parseFloat(inputNorth.value);
                    const rows = Array.from(b.querySelectorAll('.inputsRow'));
                    const index = rows.indexOf(newInputsRow);
                    
                    if (index !== -1 && !isNaN(lng) && !isNaN(lat)) {
                        points[index] = [lng, lat];
                        update(points);
                    }
                };
                inputEast.addEventListener('input', updateCoords);
                inputNorth.addEventListener('input', updateCoords);
            // Add listener and store reference on box, so it can be retrieved later
            map.on('click', onMapClick);
            box._clickListener = onMapClick;
        }
        }
        return box;
    };
    box = toggleBox(box, other_boxes);

    // Returns box and a geometry query TXT file 
    return { box, query }
}