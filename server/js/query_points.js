export function queryPointsTool(box, other_boxes) {

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
            boxTitle.textContent = "Query Points";
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

            // Define map click listener
            const onMapClick = (e) => {
                // Do nothing if no row is active
                if (!activeRow) return;
                // Extract lon and lat from clicked location
                const { lng, lat } = e.lngLat;
                // If the marker does not exist, create one. Otherwise move to lon, lat location
                if (!activeMarker) {
                    activeMarker = new maplibregl.Marker({ color: "#ff0000" })
                    .setLngLat([lng, lat])
                    .addTo(map);
                    // Create an object marker attached to activeRow
                    activeRow._marker = activeMarker;
                } else {
                    activeMarker.setLngLat([lng, lat]);
                }
                // Fill inputs of lat, lon of the active row
                const inputLon = activeRow.querySelector('input:nth-child(1)'); 
                const inputLat = activeRow.querySelector('input:nth-child(2)'); 
                inputLon.value = lng.toFixed(6);
                inputLat.value = lat.toFixed(6);

                // Automatically add a new point if the active row is the last one
                const rows = box.querySelectorAll('.inputsRow');
                if (activeRow === rows[rows.length - 1]) {
                    newPoint(box);
                }
            };

            // Add listener and store reference on box, so it can be retrieved later
            map.on('click', onMapClick);
            box._clickListener = onMapClick;
        }
        return box;
    };

    // Function to activate inputs row of a point
    const activateInputsRow = function (irow) {
        // Remove active style from row if row clicked again. Reset activeRow. Reset activeMarker. Reset cursor to normal.
        if (activeRow === irow) {
            irow.classList.remove('active');
            activeRow = null;
            activeMarker = null;
            map.getCanvas().style.cursor = '';
            return;
        }
        // Remove active style from row if escape key pressed. Reset activeRow. Reset activeMarker. Reset cursor to normal.
        document.addEventListener('keydown', (e) => {
            if (e.key == 'Escape' && activeRow) {
                activeRow.classList.remove('active');
                activeRow = null;
                activeMarker = null;
                map.getCanvas().style.cursor = '';
                return;
            }
        })
        // Remove active style from all rows first
        document.querySelectorAll('.inputsRow').forEach(r => r.classList.remove('active'));
        // Add active style to selected row and reassign activeRow
        irow.classList.add('active');
        activeRow = irow;

        // Retrieve existing marker if available
        if (activeRow._marker) {
            activeMarker = activeRow._marker;
        } else {
            activeMarker = null;
        }

        // Change cursor type when a row is active
        if (activeRow){
            map.getCanvas().style.cursor = 'crosshair';
        } 
    }

        // Function to delete a point
    const delPoint = function (row, b) {
        // Remove marker using MapLibre API
        if (row._marker) {
            row._marker.remove();
        }
        // Reset active row if we are deleting it
        if (activeRow === row) {
            activeRow = null;
            activeMarker = null;
            map.getCanvas().style.cursor = '';
        }
        row.remove();
        // Rename all the remaining points safely
        b.querySelectorAll('.inputsRow').forEach((r, i) => {
            // Update only the first child (text node) to preserve inputs
            if (r.firstChild && r.firstChild.nodeType === 3) {
                r.firstChild.nodeValue = `Point ${i + 1}`;
            }
        });
    }

    // Function to add a new point 
    const newPoint = function (b) {
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
        // Create input for latitude
        const inputNorth = document.createElement('input');
        inputNorth.type = "number";
        inputNorth.step = "any";
        inputNorth.min = "-90";
        inputNorth.max = "90";
        inputNorth.placeholder = "N";

        // Update marker when inputs change
        const updateMarker = () => {
            const lng = parseFloat(inputEast.value);
            const lat = parseFloat(inputNorth.value);
            if (!isNaN(lng) && !isNaN(lat)) {
                if (newInputsRow._marker) {
                    newInputsRow._marker.setLngLat([lng, lat]);
                } else {
                    newInputsRow._marker = new maplibregl.Marker({ color: "#ff0000" })
                        .setLngLat([lng, lat])
                        .addTo(map);
                }
                if (activeRow === newInputsRow) {
                    activeMarker = newInputsRow._marker;
                }
            }
        };
        inputEast.addEventListener('input', updateMarker);
        inputNorth.addEventListener('input', updateMarker);

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

    // Function to confirm selection
    const confirmSelection = function (b) {

        // ...
        return file
    }

    // Function to load TXT file
    const loadTxt = function (b) {

        // ...
        return file
    }

    let activeRow = null;
    let activeMarker = null;

    // Toggle box
    box = toggleBox(box, other_boxes);

    // Add a new point right after toggling the box on
    if (box) {
        newPoint(box);
        // Add a new point every time the '+' button is clicked
        document.getElementById('addPoint').addEventListener('click', () => {
            const rows = box.querySelectorAll('.inputsRow');
            const lastRow = rows[rows.length - 1];
            if (lastRow) {
                const inputs = lastRow.querySelectorAll('input');
                if (inputs[0].value === "" && inputs[1].value === "") {
                    if (activeRow !== lastRow) activateInputsRow(lastRow);
                    return;
                }
            }
            newPoint(box);
        });
    }

    // If a file is loaded, return query. If not, use confirmSelection function 
    if (file) {
        query = loadTxt(box)
    } else {
        query = confirmSelection(box)
    }

    // Returns box and a geometry query TXT file 
    return { box, query }
}
