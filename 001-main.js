// Strings longer than this get an on-screen warning. TaleSpire's real paste limit is unknown:
// Crypts (about 3,500 characters) pastes and Gauntlet (about 62,500) does not.
// 30,000 is a guess, so adjust it once the real limit is found.
const SIZE_WARNING_CHARS = 30000;

// Empties every output so a failed run never leaves an older dungeon's results on screen
function clearOutputs() {
    document.getElementById('outputArea').value = '';
    document.getElementById('rawOutputArea').value = '';
    document.getElementById('mapGrid').innerHTML = '';
    const sizeWarning = document.getElementById('sizeWarning');
    sizeWarning.textContent = '';
    sizeWarning.hidden = true;
}

function showSizeWarning(length) {
    if (length <= SIZE_WARNING_CHARS) return;
    const sizeWarning = document.getElementById('sizeWarning');
    sizeWarning.textContent = `Warning: this string is ${length.toLocaleString()} characters long and may be too big to paste into TaleSpire. ` +
        `Try a smaller dungeon if the paste fails.`;
    sizeWarning.hidden = false;
}

document.getElementById('generateButton').addEventListener('click', () => {
    console.log("==========================================");
    console.log("STARTING GENERATION PROCESS");
    clearOutputs();

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
            
            const cells = jsonData.cells;
            if (!Array.isArray(cells) || cells.length === 0 || !Array.isArray(cells[0]) || cells[0].length === 0) {
                throw new Error("Invalid Donjon JSON: 'cells' is missing or empty. This doesn't look like a Donjon dungeon file.");
            }
            const rawMatrix = jsonData.cells;
            console.log(`-> Found map grid: ${rawMatrix[0].length} columns x ${rawMatrix.length} rows.`);

            // ---------------------------------------------------
            console.log("2. Running Parser (002-donjonParser.js)...");
            const parsedGrid = processDungeonMap(rawMatrix);
            console.log("-> Parsing complete. Blueprint generated.");

            // ---------------------------------------------------
            console.log("3. Rendering HTML Debugger...");
            renderDebuggerGrid(parsedGrid);
            console.log("-> Visual debugger drawn to screen.");

            // ---------------------------------------------------
            console.log("4. Building 3D Slab Data (004-slabBuilder.js)...");
            const slabData = buildSlabFromGrid(parsedGrid);
            console.log(`-> Slab Built! Total unique asset groups generated: ${slabData.length}`);

            // ---------------------------------------------------
            console.log("5. Encoding TaleSpire String (005-talespireslabs.js)...");
            const base64String = TalespireSlabs.CreateSlab(slabData);
            console.log("-> Encoding complete!");

            // ---------------------------------------------------
            // Both boxes are filled only after encoding succeeds, so they always show the same dungeon
            console.log("6. Outputting to text area...");
            document.getElementById('rawOutputArea').value = JSON.stringify(slabData, null, 2);
            document.getElementById('outputArea').value = base64String;
            showSizeWarning(base64String.length);

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
const OPPOSITE_FACING = { NE: 'SW', SW: 'NE', SE: 'NW', NW: 'SE' };

function renderDebuggerGrid(parsedGrid) {
    const gridContainer = document.getElementById('mapGrid');
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
            // Cells without an asset or facing (floors, doors) show a dash instead of "null"
            cellDiv.title = `(${x},${y})\nType: ${cell.type}\nAsset: ${cell.finalAsset ?? '-'}\nFacing: ${cell.finalFacing ?? '-'}\nDebug: ${cell.debugId}\nScore: ${cell.corridorScore}`;

            // Create Facing Arrow
            if (cell.finalFacing && cell.finalFacing !== 'None') {
                // Arrows point at the half of the tile the wall sits on. An outer corner's facing
                // names its open side instead, so its arrow is flipped for display only.
                let arrowFacing = cell.finalFacing;
                if (cell.finalAsset === 'outer_corner') arrowFacing = OPPOSITE_FACING[arrowFacing];

                let arrow = document.createElement('span');
                arrow.className = `arrow facing-${arrowFacing.toLowerCase()}`;
                arrow.textContent = '➔';
                cellDiv.appendChild(arrow);
            }

            gridContainer.appendChild(cellDiv);
        }
    }
}