document.getElementById('uploadButton').addEventListener('click', () => {
    console.log("==========================================");
    console.log("STARTING GENERATION PROCESS");
    
    const fileInput = document.getElementById('jsonFileInput');
    if (!fileInput.files.length) {
        alert('Please select a JSON file first.');
        console.warn("Process aborted: No file selected.");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    console.log(`File selected: ${file.name}`);

    reader.onload = function(e) {
        try {
            console.log("1. Reading raw file data...");
            const jsonData = JSON.parse(e.target.result);
            
            if (!jsonData.cells) {
                throw new Error("Invalid Donjon JSON: Missing 'cells' array.");
            }
            const rawMatrix = jsonData.cells;
            console.log(`-> Found map grid: ${rawMatrix[0].length} columns x ${rawMatrix.length} rows.`);

            // ---------------------------------------------------
            console.log("2. Running Parser (donjonParser.js)...");
            const parsedGrid = processDungeonMap(rawMatrix);
            console.log("-> Parsing complete. Blueprint generated.");

            // ---------------------------------------------------
            console.log("3. Rendering HTML Debugger...");
            renderDebuggerGrid(parsedGrid);
            console.log("-> Visual debugger drawn to screen.");

            // ---------------------------------------------------
            console.log("4. Building 3D Slab Data (slabBuilder.js)...");
            const slabData = buildSlabFromGrid(parsedGrid);
            console.log(`-> Slab Built! Total unique asset groups generated: ${slabData.length}`);
            document.getElementById('SlabOutputArea').value = JSON.stringify(slabData, null, 2);

            // ---------------------------------------------------
            console.log("5. Encoding TaleSpire String (talespireslabs.js)...");
            const base64String = TalespireSlabs.CreateSlab(slabData);
            console.log("-> Encoding complete!");

            // ---------------------------------------------------
            console.log("6. Outputting to text area...");
            document.getElementById('outputArea').value = base64String;
            
            console.log("SUCCESS! Process finished flawlessly.");
            console.log("==========================================");

        } catch (error) {
            console.error("CRITICAL ERROR DURING GENERATION:", error);
            alert("An error occurred. Check the console (F12) for details.");
        }
    };

    reader.readAsText(file);
});

// ==========================================
// VISUAL DEBUGGER
// ==========================================
function renderDebuggerGrid(parsedGrid) {
    const gridContainer = document.getElementById('map-grid');
    gridContainer.innerHTML = ''; // Clear previous grid
    
    const rows = parsedGrid.length;
    const cols = parsedGrid[0].length;
    
    // Set dynamic columns based on map width
    gridContainer.style.gridTemplateColumns = `repeat(${cols}, 20px)`;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let cell = parsedGrid[y][x];
            
            let cellDiv = document.createElement('div');
            // Use cell type for color coding
            cellDiv.className = `cell ${cell.type.toLowerCase()}`;
            
            // Tooltip loaded with our Parser logic
            cellDiv.title = `(${x},${y})\nType: ${cell.type}\nAsset: ${cell.finalAsset}\nFacing: ${cell.finalFacing}\nDebug: ${cell.debugId}\nScore: ${cell.corridorScore}`;

            // Create Facing Arrow
            if (cell.finalFacing && cell.finalFacing !== 'None') {
                let arrow = document.createElement('span');
                arrow.className = `arrow facing-${cell.finalFacing.toLowerCase()}`;
                arrow.innerHTML = '➔'; 
                cellDiv.appendChild(arrow);
            }

            gridContainer.appendChild(cellDiv);
        }
    }
}