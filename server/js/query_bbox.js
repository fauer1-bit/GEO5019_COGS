async function triggerDownload(b, product, resolution) {
    // Retrieve the coordinates of the bounding box
    const rows = b.querySelectorAll('.inputsRow');
    const x1 = rows[0].querySelectorAll('input[type="number"]')[0].value;
    const y1 = rows[0].querySelectorAll('input[type="number"]')[1].value;
    const x2 = rows[1].querySelectorAll('input[type="number"]')[0].value;
    const y2 = rows[1].querySelectorAll('input[type="number"]')[1].value;
    // Call the endpoint
    const response = await fetch('/downloadBbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x1, y1, x2, y2, product, resolution})
    });
    console.log("Fetch response status:", response.status);

    if(!response.ok) {
        const error = await response.json();
        console.error("Server error:", error);
        alert(error.error);
        return null;
    }

    const blob = await response.blob();
    // Trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${product}_${resolution}_${x1}_${y1}_${x2}_${y2}.tif`;
    document.appendChild(a);
    a.click();
    document.removeChild(a);
    URL.revokeObjectURL(url);
}

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
            // Remove map click listener so the map stops trying to create markers
            if (b._clickListener) {
                map.off('click', b._clickListener);
            }
            if (b._moveListener) {
                map.off('mousemove', b._moveListener);
            }
            if (map.getLayer('draw-bbox-layer')) map.removeLayer('draw-bbox-layer');
            if (map.getSource('draw-bbox-source')) map.removeSource('draw-bbox-source');
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
            if (map.getLayer('draw-bbox-layer')) map.removeLayer('draw-bbox-layer');
            if (map.getSource('draw-bbox-source')) map.removeSource('draw-bbox-source');

            // Create box
            box = document.createElement('div');
            box.classList.add('coordinatesBox');
            const boxTitle = document.createElement('div');
            boxTitle.classList.add('boxTitle');
            boxTitle.textContent = "Query Bounding Box";
            box.appendChild(boxTitle);
            // Insert box in document
            document.body.appendChild(box);

            // Activate drawing tool
            let points = [];
            let active = true;
            let activeRow = null;
            let isDrawing = false;
            let confirmBtn = null;

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
                type: 'line',
                source: sourceId,
                paint: {
                    'line-color': '#ff0000',
                    'line-width': 3,
                    'line-dasharray': [2, 2] // preview style
                }
            });

            function update(pts) {
                if (confirmBtn) {
                    const isValid = pts.length >= 2 && pts[0] && pts[1];
                    if (isValid) {
                        confirmBtn.disabled = false;
                        confirmBtn.style.backgroundColor = 'transparent';
                        confirmBtn.style.color = 'black';
                        confirmBtn.style.cursor = 'pointer';
                        confirmBtn.style.border = 'none';
                    } else {
                        confirmBtn.disabled = true;
                        confirmBtn.style.backgroundColor = 'transparent';
                        confirmBtn.style.color = '#ccc';
                        confirmBtn.style.cursor = 'not-allowed';
                        confirmBtn.style.border = 'none';
                    }
                }
                if (pts.length < 2 || !pts[0] || !pts[1]) {
                    map.getSource(sourceId).setData({
                        type: 'Feature',
                        geometry: { type: 'Polygon', coordinates: [] }
                    });
                    return;
                }
                const minX = Math.min(pts[0][0], pts[1][0]);
                const maxX = Math.max(pts[0][0], pts[1][0]);
                const minY = Math.min(pts[0][1], pts[1][1]);
                const maxY = Math.max(pts[0][1], pts[1][1]);

                const coords = [[
                    [minX, minY],
                    [maxX, minY],
                    [maxX, maxY],
                    [minX, maxY],
                    [minX, minY]
                ]];

                map.getSource(sourceId).setData({
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: coords
                    }
                });
            }

            // Function to activate inputs row of a point
            const activateInputsRow = function (irow) {
                isDrawing = false;
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
                    if (map.getLayer(layerId)) {
                        map.setPaintProperty(layerId, 'line-dasharray', [2, 2]);
                    }
                } 
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
                    
                    if (index !== -1) {
                        if (!isNaN(lng) && !isNaN(lat)) {
                            points[index] = [lng, lat];
                        } else {
                            points[index] = null;
                        }
                        update(points);
                    }
                };
                inputEast.addEventListener('input', updateCoords);
                inputNorth.addEventListener('input', updateCoords);

                newInputsRow.appendChild(inputEast);
                newInputsRow.appendChild(inputNorth);
                newInputsRow.addEventListener('click', () => activateInputsRow(newInputsRow));
                b.appendChild(newInputsRow);
                activateInputsRow(newInputsRow);
            }

            const onMouseMove = (e) => {
                if (!isDrawing || !activeRow) return;
                const { lng, lat } = e.lngLat;
                const inputs = activeRow.querySelectorAll('input');
                inputs[0].value = lng.toFixed(6);
                inputs[1].value = lat.toFixed(6);
                inputs[0].dispatchEvent(new Event('input'));
            };

            // Define map click listener
            const onMapClick = (e) => {
                // Do nothing if no row is active
                if (!activeRow) return;
                // Extract lon and lat from clicked location
                const { lng, lat } = e.lngLat;
                // Fill inputs of lat, lon of the active row
                const inputs = activeRow.querySelectorAll('input');
                const inputLon = inputs[0];
                const inputLat = inputs[1];
                inputLon.value = lng.toFixed(6);
                inputLat.value = lat.toFixed(6);
                
                // Trigger update
                inputLon.dispatchEvent(new Event('input'));

                // Logic for drawing sequence
                const rows = Array.from(box.querySelectorAll('.inputsRow'));
                const index = rows.indexOf(activeRow);

                if (index === 0 && rows[1]) {
                    // Point 1 clicked. Start drawing Point 2.
                    activateInputsRow(rows[1]);
                    isDrawing = true;
                } else {
                    isDrawing = false;
                    if (map.getLayer(layerId)) {
                        map.setPaintProperty(layerId, 'line-dasharray', [1, 0]);
                    }
                }
            };

            map.on('click', onMapClick);
            map.on('mousemove', onMouseMove);
            box._clickListener = onMapClick;
            box._moveListener = onMouseMove;

            // Add two Points when the box is created
            newPoint(box);
            newPoint(box);

            // Create Product Type buttons (DTM, DSM)
            const productsContainer = document.createElement('div');
            productsContainer.style.padding = '10px';
            productsContainer.style.display = 'flex';
            productsContainer.style.gap = '10px';

            let selectedProduct = 'DTM';
            
            ['DTM', 'DSM'].forEach(type => {
                const btn = document.createElement('button');
                btn.textContent = type;

                const isSelected = type === selectedProduct;

                btn.style.border = '1px solid #ccc';
                btn.style.borderRadius = '5px';
                btn.style.padding = '5px 15px';
                btn.style.fontSize = '14px';
                btn.style.fontWeight = 'bold';
                
                btn.style.backgroundColor = isSelected ? '#0077cc' : 'white';
                btn.style.color = isSelected ? 'white' : '#333';
                btn.style.borderColor = isSelected ? '#0077cc' : '#ccc';

                btn.addEventListener('click', () => {
                    selectedProduct = type;

                    Array.from(productsContainer.children).forEach(b => {
                        b.style.backgroundColor = 'white';
                        b.style.color = '#333';
                        b.style.borderColor = '#ccc';
                    });
                    btn.style.backgroundColor = '#0077cc';
                    btn.style.color = 'white';
                    btn.style.borderColor = '#0077cc';
                });
                productsContainer.appendChild(btn);
            });
            box.appendChild(productsContainer);

            // Create Resolution buttons
            const resolutionsContainer = document.createElement('div');
            resolutionsContainer.style.padding = '0 10px 10px 10px';
            resolutionsContainer.style.display = 'flex';
            resolutionsContainer.style.gap = '5px';
            resolutionsContainer.style.flexWrap = 'wrap';

            let selectedRes = '0.5 m';

            ['0.5 m', '1.0 m', '2.0 m', '4.0 m', '8.0 m', '16.0 m', '32.0 m'].forEach(res => {
                const btn = document.createElement('button');
                btn.textContent = res;
                
                const isSelected = res === selectedRes;

                btn.style.border = '1px solid #ccc';
                btn.style.borderRadius = '5px';
                btn.style.padding = '5px 10px';
                btn.style.fontSize = '12px';
                
                btn.style.backgroundColor = isSelected ? '#0077cc' : 'white';
                btn.style.color = isSelected ? 'white' : '#333';
                btn.style.borderColor = isSelected ? '#0077cc' : '#ccc';

                btn.addEventListener('click', () => {
                    selectedRes = res;

                    Array.from(resolutionsContainer.children).forEach(b => {
                        b.style.backgroundColor = 'white';
                        b.style.color = '#333';
                        b.style.borderColor = '#ccc';
                    });
                    btn.style.backgroundColor = '#0077cc';
                    btn.style.color = 'white';
                    btn.style.borderColor = '#0077cc';
                });
                resolutionsContainer.appendChild(btn);
            });
            box.appendChild(resolutionsContainer);

            // Create Confirm Selection button
            confirmBtn = document.createElement('button');
            confirmBtn.style.margin = '10px';
            confirmBtn.style.display = 'flex';
            confirmBtn.style.alignItems = 'center';
            confirmBtn.title = 'Download selection';
            confirmBtn.style.padding = '5px';
            confirmBtn.disabled = true;
            confirmBtn.style.backgroundColor = 'transparent';
            confirmBtn.style.color = '#ccc';
            confirmBtn.style.cursor = 'not-allowed';
            confirmBtn.style.border = 'none';
            const downloadIcon = document.createElement('span');
            downloadIcon.classList.add('material-symbols-outlined');
            downloadIcon.textContent = 'download';
            confirmBtn.appendChild(downloadIcon);
            // Generate download when confirmBtn is pressed
            confirmBtn.addEventListener('click', () => triggerDownload(box, selectedProduct, selectedRes));
            box.appendChild(confirmBtn);

            // Set active row to the first point
            const firstRow = box.querySelector('.inputsRow');
            if (firstRow) activateInputsRow(firstRow);
        }
        return box;
    };
    box = toggleBox(box, other_boxes);

    // Returns box and a geometry query TXT file 
    return { box, query }
}