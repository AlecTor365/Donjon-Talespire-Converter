// ==========================================
// 1. CONFIGURATION: ASSET IDs & PREFABS
// ==========================================

// Compass
// x : Left to Right
// z : -1 = Up, +1 = Down

// const ASSET_IDS = { 
//     floor: "940d013f-c982-43e7-922a-0317cc1c74db", 
//     portcullis: "fcb7a2fe-4b79-4d0a-b1fd-31e4b17ffaf5", 
//     door: "3151e230-bac7-401e-8fa8-b993bbee17ea", 
//     wall_straight: "c8312af8-8bfb-41e1-bb6e-30280686b168", 
//     wall_corner: "0820791e-c1a8-4a1e-b690-f34b0cb276ba",
//     outer_corner: "bb8e7378-44da-4556-bac5-92420f766815",
//     solid_block: "0252d209-c23c-4f72-aa8b-51ed0dc09f3a", 
//     stairs : "f4a32f18-e4ce-4dd3-baec-cdd3da36c28e"
// };

// const PREFABS = { 
//     "Door_Prefab": [ 
//         { key: "floor", y_bump: 0.0, inherits_rotation: false },
//         { key: "door", y_bump: 0.5, inherits_rotation: true, N: {z : 0.5} , E: {x : -0.5} } 
//     ], 
//     "Portcullis_Prefab": [ 
//         { key: "floor", y_bump: 0.0, inherits_rotation: false },
//         { key: "portcullis", y_bump: 0.5, inherits_rotation: true, N: {z : 0.5} , E: {x : -0.5} } 
//     ],
//     "Solid_Prefab": [ 
//         { key: "floor", y_bump: 0.0, inherits_rotation: false },
//         { key: "solid_block", y_bump: 0.5, inherits_rotation: false },
//         { key: "solid_block", y_bump: 1.5, inherits_rotation: false }
//     ],
//     "outer_corner_Prefab": [ 
//     { key: "floor", y_bump: 0.0, inherits_rotation: false },
//     { key: "outer_corner", y_bump: 0.5, inherits_rotation: true, NE: {x : -0.5, z : 0.5}, SE: {x : -0.5}, NW: {z: 0.5} }
//     ],
//     "Stairs_Prefab": [ 
//     { key: "floor", y_bump: 0.0, inherits_rotation: false },
//     { key: "stairs", y_bump: 0.5, inherits_rotation: true }
//     ]
// };

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
// 2. STATE MANAGEMENT & PLACEMENT LOGIC
// ==========================================
let slabData = []; 
let offsetX = 0; 
let offsetY = 0; 

function initSlabData() { 
    slabData = []; 
    for (let key in ASSET_IDS) { 
        slabData.push({ nguid: ASSET_IDS[key], assets: [] }); 
    } 
}

function calculateMapOffset(rows, cols) { 
    offsetX = Math.floor(cols / 2); 
    offsetY = Math.floor(rows / 2); 
}

function placeAsset(assetKey, x, y, z, rotation) { 
    let guid = ASSET_IDS[assetKey];
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
    if (!prefab) return; 

    let baseRotation = ROTATIONS[facing] || 0;

    for (let item of prefab) {
        let rot = item.inherits_rotation ? baseRotation : 0;
        
        let xBump = 0;
        let zBump = 0;

        let directionData = item[facing]; 

        if (directionData) {
            xBump = directionData.x || 0;
            zBump = directionData.z || 0;
        } else {
            xBump = item.x_bump || 0;
            zBump = item.z_bump || 0;
        }

        placeAsset(item.key, x + xBump, item.y_bump || 0, z + zBump, rot);
    }
}


// ==========================================
// 3. THE MAIN SWEEP
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
            let isWalkable = ['ROOM', 'CORRIDOR', 'DOOR', 'PORTCULLIS', 'STAIRS', 'SECRET', 'ARCH'].includes(cell.type);
            if (isWalkable) {
                placeAsset("floor", x, 0.0, y, 0);
            }

            // --- LAYER 2: THE ARCHITECTURE ---
            if (cell.type === 'WALL') {
                if (cell.finalAsset === 'outer_corner') {
                        placePrefab("outer_corner_Prefab", x, y, cell.finalFacing);
                } 
                else if (cell.finalAsset === 'solid_block') {
                    placePrefab("Solid_Prefab", x, y, 0);
                } 
                else {
                    let rot = ROTATIONS[cell.finalFacing] || 0;
                    placeAsset(cell.finalAsset, x, 0.0, y, rot);
                }
            } 
            else if (cell.type === 'SOLID') {
                placePrefab("Solid_Prefab", x, y, 0);
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