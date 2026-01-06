export function queryPolylineTool(box, other_boxes) {
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
            // Remove map click listener from query_points tool so the map stops trying to create markers
            if (other._clickListener) {
                map.off('click', other._clickListener);
            }
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
            // Cleanup drawing listeners and layer
            if (b._clickListener) map.off('click', b._clickListener);
            if (b._moveListener) map.off('mousemove', b._moveListener);
            if (b._keyListener) document.removeEventListener('keydown', b._keyListener);
            
            if (map.getLayer('draw-line-layer')) map.removeLayer('draw-line-layer');
            if (map.getSource('draw-line-source')) map.removeSource('draw-line-source');
            map.getCanvas().style.cursor = '';
            
            return null
        } 
        // Otherwise, display toolbox
        else {
            // Cleanup potential lingering state from external close
            if (b) {
                if (b._clickListener) map.off('click', b._clickListener);
                if (b._moveListener) map.off('mousemove', b._moveListener);
                if (b._keyListener) document.removeEventListener('keydown', b._keyListener);
            }
            if (map.getLayer('draw-line-layer')) map.removeLayer('draw-line-layer');
            if (map.getSource('draw-line-source')) map.removeSource('draw-line-source');

            // Create box
            box = document.createElement('div');
            box.classList.add('coordinatesBox');
            const boxTitle = document.createElement('div');
            boxTitle.classList.add('boxTitle');
            boxTitle.textContent = "Query Profile";
            box.appendChild(boxTitle);
            // Add a + icon to add more points
            const addPoint = document.createElement('button');
            addPoint.id = "addPoint";
            addPoint.title = "Add point";
            const plus_icon = document.createElement('span');
            plus_icon.classList.add('material-symbols-outlined');
            plus_icon.textContent = 'add';
            addPoint.appendChild(plus_icon);
            box.appendChild(addPoint);
            // Insert box in document
            document.body.appendChild(box);

            // Activate drawing tool
            let points = [];
            let active = true;
            let activeRow = null;

            const sourceId = 'draw-line-source';
            const layerId = 'draw-line-layer';

            map.getCanvas().style.cursor = 'crosshair';

            map.addSource(sourceId, {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: [] }
                }
            });

            map.addLayer({
                id: layerId,
                type: 'line',
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

            // Function to delete a point
            const delPoint = function (row, b) {
                if (activeRow === row) {
                    activeRow = null;
                    map.getCanvas().style.cursor = '';
                }
                // Update points array and map
                const rows = Array.from(b.querySelectorAll('.inputsRow'));
                const index = rows.indexOf(row);
                if (index > -1) {
                    points.splice(index, 1);
                    update(points);
                }
                row.remove();
                b.querySelectorAll('.inputsRow').forEach((r, i) => {
                    if (r.firstChild && r.firstChild.nodeType === 3) {
                        r.firstChild.nodeValue = `Point ${i + 1}`;
                    }
                });
            }

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

                // Create 'x' button for point deletion
                const deletePoint = document.createElement('button');
                deletePoint.id = "deletePoint";
                deletePoint.title = "Delete point";
                const xIcon = document.createElement('span');
                xIcon.classList.add('material-symbols-outlined');
                xIcon.textContent = 'close';
                deletePoint.appendChild(xIcon);
                // Add event listener to delete a point
                deletePoint.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent row activation when clicking delete
                    delPoint(newInputsRow, b);
                })
                // Assemble input row elements
                newInputsRow.appendChild(inputEast);
                newInputsRow.appendChild(inputNorth);
                newInputsRow.appendChild(deletePoint);
                // Add click listener to activate row
                newInputsRow.addEventListener('click', () => activateInputsRow(newInputsRow));
                // Insert point before plus icon
                const addPoint = document.getElementById('addPoint');
                b.insertBefore(newInputsRow, addPoint);
                // Activate inputs row
                activateInputsRow(newInputsRow);
            }

            function update(coords) {
                map.getSource(sourceId).setData({
                    type: 'Feature',
                    geometry: {
                    type: 'LineString',
                    coordinates: coords
                }
                });
            }

            function onClick(e) {
                if (!active) return;
                
                // Check if the last row is empty (e.g. created by reactivating tool)
                const rows = box.querySelectorAll('.inputsRow');
                const lastRow = rows[rows.length - 1];
                let filledExisting = false;

                if (lastRow) {
                    const inputs = lastRow.querySelectorAll('input');
                    if (inputs[0].value === "" && inputs[1].value === "") {
                        inputs[0].value = e.lngLat.lng.toFixed(6);
                        inputs[1].value = e.lngLat.lat.toFixed(6);
                        filledExisting = true;
                    }
                }

                points.push([e.lngLat.lng, e.lngLat.lat]);
                if (!filledExisting) {
                    newPoint(box, e.lngLat.lng, e.lngLat.lat);
                }
                update(points);
            }

            function onMove(e) {
                if (!active || points.length === 0) return;
                update([...points, [e.lngLat.lng, e.lngLat.lat]]);
            }

            function onKeyDown(e) {
                if (e.key === 'Escape') {
                    active = false;
                    map.off('click', onClick);
                    map.off('mousemove', onMove);
                    document.removeEventListener('keydown', onKeyDown);

                    // Update map to remove the preview segment
                    update(points);

                    // Final line = solid
                    map.setPaintProperty(layerId, 'line-dasharray', [1, 0]);

                    console.log('Final polyline:', points);
                }
            }

            map.on('click', onClick);
            map.on('mousemove', onMove);
            document.addEventListener('keydown', onKeyDown);

            // Store listeners for cleanup
            box._clickListener = onClick;
            box._moveListener = onMove;
            box._keyListener = onKeyDown;

            // Resume drawing when clicking the + icon
            addPoint.addEventListener('click', () => {
                newPoint(box);
                if (!active) {
                    active = true;
                    map.getCanvas().style.cursor = 'crosshair';
                    map.setPaintProperty(layerId, 'line-dasharray', [2, 2]);
                    map.on('click', onClick);
                    map.on('mousemove', onMove);
                    document.addEventListener('keydown', onKeyDown);
                }
            });

            // Initialize with one empty point
            newPoint(box);
        }   
    return box;
    };

    box = toggleBox(box, other_boxes);

    // Returns box and a geometry query TXT file 
    return { box, query }
}
