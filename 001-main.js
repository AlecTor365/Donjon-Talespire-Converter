// Strings longer than this get an on-screen warning. TaleSpire's paste limit is 30 kB.
const SIZE_WARNING_CHARS = 30000;

// Empties every output so a failed run never leaves an older dungeon's results on screen
function clearOutputs() {
    document.getElementById('outputArea').value = '';
    document.getElementById('rawOutputArea').value = '';
    document.getElementById('mapGrid').innerHTML = '';
    const sizeWarning = document.getElementById('sizeWarning');
    sizeWarning.textContent = '';
    sizeWarning.hidden = true;
    document.getElementById('copyButton').disabled = true;
    document.getElementById('copyStatus').textContent = '';
    const partTabs = document.getElementById('partTabs');
    partTabs.innerHTML = '';
    partTabs.hidden = true;
    currentParts = [];
}

// Outer Ring only applies while Trim Excess is on
function updateCleanupOptions() {
    document.getElementById('ringToggle').disabled = !document.getElementById('trimToggle').checked;
}
document.getElementById('trimToggle').addEventListener('change', updateCleanupOptions);
updateCleanupOptions();

// ==========================================
// PART TABS (Split Dungeon)
// ==========================================
// Every result is a list of parts: one part normally, several when the dungeon is split.
// Each part: { name, x0, x1, y0, y1 (map cells), slab, string }.
let currentParts = [];
let debuggerCols = 0;

function showParts(parts) {
    currentParts = parts;
    const partTabs = document.getElementById('partTabs');
    partTabs.innerHTML = '';
    partTabs.hidden = parts.length < 2;
    if (parts.length > 1) {
        parts.forEach((part, index) => {
            const tab = document.createElement('button');
            tab.className = 'part-tab';
            tab.setAttribute('role', 'tab');
            tab.textContent = `${index + 1}. ${part.name} (${part.string.length.toLocaleString()})`;
            tab.addEventListener('click', () => showPart(index));
            partTabs.appendChild(tab);
        });
    }
    showPart(0);
}

// Shows one part's string and raw output, and tints its area in the debugger (only when split)
function showPart(index) {
    const part = currentParts[index];
    if (!part) return;
    document.getElementById('outputArea').value = part.string;
    document.getElementById('rawOutputArea').value = JSON.stringify(part.slab, null, 2);
    document.getElementById('copyButton').disabled = false;
    document.getElementById('copyStatus').textContent = '';

    const sizeWarning = document.getElementById('sizeWarning');
    sizeWarning.textContent = '';
    sizeWarning.hidden = true;
    showSizeWarning(part.string.length);

    document.querySelectorAll('#partTabs .part-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
        tab.setAttribute('aria-selected', i === index);
    });

    const cells = document.getElementById('mapGrid').children;
    for (let i = 0; i < cells.length; i++) {
        const x = i % debuggerCols, y = Math.floor(i / debuggerCols);
        const inPart = currentParts.length > 1 && x >= part.x0 && x < part.x1 && y >= part.y0 && y < part.y1;
        cells[i].classList.toggle('part-active', inPart);
    }
}

// ==========================================
// COPY BUTTON
// ==========================================
// Copies the whole TaleSpire string to the clipboard in one click
async function copyString() {
    const outputArea = document.getElementById('outputArea');
    const copyStatus = document.getElementById('copyStatus');
    if (!outputArea.value) return;

    try {
        await navigator.clipboard.writeText(outputArea.value);
        copyStatus.textContent = 'Copied!';
    } catch (error) {
        // Some browsers block the clipboard for pages opened from a file, so fall back to the older copy command
        outputArea.select();
        const copied = document.execCommand('copy');
        copyStatus.textContent = copied ? 'Copied!' : 'Copy failed: click the box, press Ctrl+A, then Ctrl+C';
    }
    setTimeout(() => { copyStatus.textContent = ''; }, 2500);
}

document.getElementById('copyButton').addEventListener('click', copyString);

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
            if (document.getElementById('trimToggle').checked) {
                console.log("3. Trimming the grid (003-cleanUp.js)...");
                const keepOuterRing = document.getElementById('ringToggle').checked;
                const trimmedCount = gridTrim(parsedGrid, keepOuterRing);
                console.log(`-> Trimmed ${trimmedCount} cells of rock outside the dungeon${keepOuterRing ? ' (outer ring kept as plain floor)' : ''}.`);
            } else {
                console.log("3. Trimming skipped (checkbox is off).");
            }

            // ---------------------------------------------------
            console.log("4. Rendering HTML Debugger...");
            renderDebuggerGrid(parsedGrid);
            console.log("-> Visual debugger drawn to screen.");

            // ---------------------------------------------------
            // Steps 5 and 6 together: building and encoding. When merging, the 2x2 floor grid is tried
            // from all four starting positions and the shortest string is kept.
            let slabData, base64String;
            let gridParity = null;   // which cell lines the merged 2x2 floor grid uses, so splits follow it
            const bigMode = document.getElementById('bigModeToggle').checked;
            if (bigMode) {
                console.log("5-6. Building Big Mode slab (005-slabBuilder.js) and encoding (006-talespireslabs.js)...");
                slabData = buildBigSlabFromGrid(parsedGrid);
                base64String = TalespireSlabs.CreateSlab(slabData);
            } else if (document.getElementById('mergeToggle').checked) {
                console.log("5-6. Building merged slab (005-slabBuilder.js) and encoding (006-talespireslabs.js)...");
                for (const [shiftX, shiftY] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
                    const candidateSlab = buildMergedSlabFromGrid(parsedGrid, shiftX, shiftY);
                    const candidateString = TalespireSlabs.CreateSlab(candidateSlab);
                    const assets = candidateSlab.reduce((sum, group) => sum + group.assets.length, 0);
                    console.log(`   grid shift (${shiftX}, ${shiftY}): ${assets} assets, ${candidateString.length} characters`);
                    if (!base64String || candidateString.length < base64String.length) {
                        slabData = candidateSlab;
                        base64String = candidateString;
                        gridParity = { x: shiftX, y: shiftY };
                    }
                }
            } else {
                console.log("5-6. Building slab (005-slabBuilder.js) and encoding (006-talespireslabs.js)...");
                slabData = buildSlabFromGrid(parsedGrid);
                base64String = TalespireSlabs.CreateSlab(slabData);
            }
            const totalAssets = slabData.reduce((sum, group) => sum + group.assets.length, 0);
            console.log(`-> Done! ${totalAssets} assets in ${slabData.length} asset groups, ${base64String.length} characters.`);

            // ---------------------------------------------------
            // Split Dungeon: only splits when the string is too long; each part fits on its own
            const cols = parsedGrid[0].length, rows = parsedGrid.length;
            let parts = [{ name: 'Whole dungeon', x0: 0, x1: cols, y0: 0, y1: rows, slab: slabData, string: base64String }];
            if (document.getElementById('splitToggle').checked && base64String.length > SIZE_WARNING_CHARS) {
                console.log("6b. Splitting the dungeon (007-slabSplitter.js)...");
                parts = splitSlab(slabData, cols, rows, bigMode ? 2 : 1, gridParity, SIZE_WARNING_CHARS);
                console.log(`-> Split into ${parts.length} parts: ` + parts.map(p => `${p.name} ${p.string.length} characters`).join(', '));
            }

            // ---------------------------------------------------
            // Both boxes are filled only after encoding succeeds, so they always show the same dungeon
            console.log("7. Outputting to text area...");
            showParts(parts);

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
    debuggerCols = cols;   // used by showPart to find each cell's position for the part tint

    // Set dynamic columns based on map width
    gridContainer.style.gridTemplateColumns = `repeat(${cols}, 20px)`;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let cell = parsedGrid[y][x];
            
            let cellDiv = document.createElement('div');
            // Use cell type for color coding
            cellDiv.className = `cell ${cell.type.toLowerCase()}${cell.isTrimmed ? ' trimmed' : ''}${cell.isRing ? ' ring' : ''}`;
            
            // Tooltip loaded with our Parser logic
            // Cells without an asset or facing (floors, doors) show a dash instead of "null"
            cellDiv.title = `(${x},${y})\nType: ${cell.type}\nAsset: ${cell.finalAsset ?? '-'}\nFacing: ${cell.finalFacing ?? '-'}\nDebug: ${cell.debugId}\nScore: ${cell.corridorScore}${cell.isTrimmed ? '\nTrimmed: no assets placed' : ''}${cell.isRing ? '\nOuter ring: one plain floor' : ''}`;

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