// ==========================================
// Compass and Notes
// ==========================================

// Compass
// x : Left to Right
// z : -1 = Up, +1 = Down
// TaleSpire uses 24 rotation increments (360/24 = 15 degrees).
const ROTATIONS = {
    'N': 0, 
    'E': 6,   
    'S': -12,  
    'W': -6,  
    'NE': 0,  
    'SE': 6,  
    'SW': -12, 
    'NW': -6, 
    'None': 0
};

// ==========================================
// STATE MANAGEMENT & PLACEMENT LOGIC
// ==========================================
let slabData = [];
let offsetX = 0;
let offsetY = 0;
let warnedNames = new Set(); // So each missing asset/prefab name is only warned about once per run

function initSlabData() {
    slabData = [];
    warnedNames = new Set();
    for (let key in ASSET_IDS) {
        slabData.push({ nguid: ASSET_IDS[key], assets: [] }); 
    } 
}

function calculateMapOffset(rows, cols) { 
    offsetX = Math.floor(cols / 2); 
    offsetY = Math.floor(rows / 2); 
}

function warnOnce(message) {
    if (warnedNames.has(message)) return;
    warnedNames.add(message);
    console.warn(message);
}

function placeAsset(assetKey, x, y, z, rotation) {
    let guid = ASSET_IDS[assetKey];
    if (!guid) {
        warnOnce(`placeAsset: "${assetKey}" is not in this theme's ASSET_IDS, so it was skipped.`);
        return;
    }
    let assetGroup = slabData.find(group => group.nguid === guid);

    if (assetGroup) {
        assetGroup.assets.push({ 
            rotation: rotation, 
            bounds: { 
                // X-Axis Mirroring : TaleSpire expects negative X to expand right correctly
                center: { x: -(x - offsetX), y: y, z: (z - offsetY) }, 
                extents: { x: 1, y: 1, z: 1 } 
            } 
        }); 
    } 
}


function placePrefab(prefabName, x, z, facing) { 
    const prefab = PREFABS[prefabName];
    if (!prefab) {
        warnOnce(`placePrefab: "${prefabName}" is not in PREFABS, so it was skipped.`);
        return;
    }

    let baseRotation = ROTATIONS[facing] || 0;

    for (let item of prefab) {
        let rot = item.inherits_rotation ? baseRotation : 0;
        
        let xBump = 0;
        let zBump = 0;

        let directionData = item[facing]; 

        if (directionData) {
            xBump = directionData.x || 0;
            zBump = directionData.z || 0;
        }
        placeAsset(item.key, x + xBump, item.y_bump || 0, z + zBump, rot);
    }
}


// ==========================================
// THE MAIN SWEEP
// ==========================================
function buildSlabFromGrid(parsedGrid) {
    const rows = parsedGrid.length;
    const cols = parsedGrid[0].length;
    
    initSlabData();
    calculateMapOffset(rows, cols);

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let cell = parsedGrid[y][x];

            // --- LAYER 1: THE FOUNDATION (Floors) ---
            // Prefabs no longer carry their own floor, so every cell that needs one gets it here.
            let needsFloor = ['ROOM', 'CORRIDOR', 'DOOR', 'LOCKED', 'TRAPPED', 'SECRET', 'PORTCULLIS', 'STAIRS', 'ARCH'].includes(cell.type);
            let isFlooredWall = cell.type === 'WALL' && ['solid_block', 'outer_corner'].includes(cell.finalAsset);
            if (needsFloor || isFlooredWall) {
                placeAsset("floor", x, 0.0, y, 0);
            }

            // --- LAYER 2: THE ARCHITECTURE ---
            if (cell.type === 'WALL') {
                if (cell.finalAsset === 'outer_corner') {
                        placePrefab("outer_corner_Prefab", x, y, cell.finalFacing);
                } 
                else if (cell.finalAsset === 'solid_block') {
                    placePrefab("Solid_Prefab", x, y, 'None');
                } 
                else {
                    let rot = ROTATIONS[cell.finalFacing] || 0;
                    placeAsset(cell.finalAsset, x, 0.0, y, rot);
                }
            } 
            else if (['DOOR', 'LOCKED', 'TRAPPED', 'SECRET'].includes(cell.type)) {
                placePrefab("Door_Prefab", x, y, cell.finalFacing);
            } 
            else if (cell.type === 'PORTCULLIS') {
                placePrefab("Portcullis_Prefab", x, y, cell.finalFacing);
            }
            else if (cell.type === 'STAIRS') {
                placePrefab("Stairs_Prefab", x, y, cell.finalFacing);
            }
        }
    }

    return finalizeSlabData();
}

function finalizeSlabData() { 
    let cleanData = slabData.filter(group => group.assets.length > 0); 

    return cleanData; 
}