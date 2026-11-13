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
        slabData.push({ nguid: ASSET_IDS[key].id, assets: [] });
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
    const asset = ASSET_IDS[assetKey];
    if (!asset || !asset.id) {
        warnOnce(`placeAsset: "${assetKey}" is not in this theme's ASSET_IDS, so it was skipped.`);
        return;
    }

    // Extents are half of the asset's size. TaleSpire doesn't use them to place assets,
    // but the slab format needs a value. A missing size falls back to a 1x1x1 tile.
    let size = asset;
    if (![asset.x, asset.y, asset.z].every(Number.isFinite)) {
        warnOnce(`placeAsset: "${assetKey}" has no x/y/z size in ASSET_IDS, so a 1x1x1 size was used.`);
        size = { x: 1, y: 1, z: 1 };
    }

    let assetGroup = slabData.find(group => group.nguid === asset.id);

    if (assetGroup) {
        assetGroup.assets.push({ 
            rotation: rotation, 
            bounds: { 
                // X-Axis Mirroring : TaleSpire expects negative X to expand right correctly
                center: { x: -(x - offsetX), y: y, z: (z - offsetY) },
                extents: { x: 1, y: 1, z: 1}
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

            // Trimmed cells (see 003-cleanUp.js) get no assets at all; outer ring cells get one plain floor
            if (cell.isTrimmed) continue;
            if (cell.isRing) {
                placeAsset("floor", x, 0.0, y, 0);
                continue;
            }

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

// ==========================================
// THE MERGED SWEEP (when "Merge floors & walls" is ticked)
// ==========================================
// TaleSpire places every piece by the corner of the area it covers, whatever its rotation
// (found with the test slabs). So pieces are placed from the area they cover, given in map cells:
// u0..u1 runs west to east, v0..v1 north to south. Fractions are allowed (a wall covers half a cell).
function placeCovering(assetKey, u0, u1, v0, v1, height, rotation) {
    // The slab mirrors map x, so the covered area's corner in slab space comes from its east edge (u1)
    placeAsset(assetKey, u1 - 1, height, v0, rotation);
}

// A wall-only piece along one side of 'length' cells starting at cell (x, y), facing N, E, S or W
function placeWallStrip(assetKey, x, y, length, facing) {
    const rot = ROTATIONS[facing];
    if (facing === 'N') placeCovering(assetKey, x, x + length, y, y + 0.5, 0.5, rot);
    else if (facing === 'S') placeCovering(assetKey, x, x + length, y + 0.5, y + 1, 0.5, rot);
    else if (facing === 'E') placeCovering(assetKey, x + 0.5, x + 1, y, y + length, 0.5, rot);
    else if (facing === 'W') placeCovering(assetKey, x, x + 0.5, y, y + length, 0.5, rot);
}

function buildMergedSlabFromGrid(parsedGrid, shiftX, shiftY) {
    const rows = parsedGrid.length;
    const cols = parsedGrid[0].length;

    initSlabData();
    calculateMapOffset(rows, cols);

    // --- LAYER 1: FLOOR GRID ---
    const floor1x2 = ASSET_IDS.floor_1x2;
    const floor1x2RunsEastWest = floor1x2 && floor1x2.x > floor1x2.z;
    for (const piece of planFloorGrid(parsedGrid, shiftX, shiftY)) {
        const area = piece.w * piece.d;
        if (area === 4) {
            placeCovering('floor_2x2', piece.x, piece.x + 2, piece.y, piece.y + 2, 0, 0);
        } else if (area === 2) {
            // Turn the 1x2 floor only when its natural direction doesn't match the gap
            const rot = ((piece.w === 2) === floor1x2RunsEastWest) ? 0 : 6;
            placeCovering('floor_1x2', piece.x, piece.x + piece.w, piece.y, piece.y + piece.d, 0, rot);
        } else {
            placeCovering('floor', piece.x, piece.x + 1, piece.y, piece.y + 1, 0, 0);
        }
    }

    // --- LAYER 2: INNER WALLS (wall-only pieces) ---
    for (const wall of planInnerWalls(parsedGrid)) {
        placeWallStrip(wall.length === 2 ? 'wall_2x1' : 'wall_1x1', wall.x, wall.y, wall.length, wall.facing);
    }

    // --- LAYER 3: ROCK ---
    const rock = planRock(parsedGrid);
    for (const pair of rock.pairs) {
        if (pair.horizontal) {
            placeWallStrip('wall_2x1', pair.x, pair.y, 2, 'N');
            placeWallStrip('wall_2x1', pair.x, pair.y, 2, 'S');
        } else {
            placeWallStrip('wall_2x1', pair.x, pair.y, 2, 'E');
            placeWallStrip('wall_2x1', pair.x, pair.y, 2, 'W');
        }
    }
    for (const single of rock.singles) {
        placePrefab("Solid_Prefab", single.x, single.y, 'None');
    }

    // --- LAYER 4: COMBINED WALLS, CORNER FILLERS, DOORS, STAIRS ---
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const cell = parsedGrid[y][x];
            if (cell.isTrimmed) continue;

            if (usesCombinedWall(parsedGrid, x, y)) {
                placeAsset(cell.finalAsset, x, 0.0, y, ROTATIONS[cell.finalFacing] || 0);
            }
            else if (cell.type === 'WALL' && cell.finalAsset === 'outer_corner') {
                placePrefab("outer_corner_Prefab", x, y, cell.finalFacing);
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

// ==========================================
// THE BIG MODE SWEEP (when "Big Mode" is ticked)
// ==========================================
// Every Donjon cell becomes a 2x2 tile area (10 ft instead of 5 ft), so each cell gets one 2x2 piece
// and no merging is needed. Positions below were confirmed with the Big Mode test slab.
const OPPOSITE_CORNER = { NE: 'SW', SE: 'NW', SW: 'NE', NW: 'SE' };

function buildBigSlabFromGrid(parsedGrid) {
    const rows = parsedGrid.length;
    const cols = parsedGrid[0].length;

    initSlabData();
    calculateMapOffset(rows * 2, cols * 2);   // positions are in tiles: cell (x, y) covers tiles 2x..2x+2, 2y..2y+2

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const cell = parsedGrid[y][x];
            if (cell.isTrimmed) continue;

            const u = 2 * x, v = 2 * y;               // the cell's north-west tile
            const rot = ROTATIONS[cell.finalFacing] || 0;

            // --- OUTER RING: one plain 2x2 floor ---
            if (cell.isRing) {
                placeCovering('floor_2x2', u, u + 2, v, v + 2, 0, 0);
                continue;
            }

            // --- FLOOR: walkable cells, doors, stairs and outer corners ---
            if (FLOOR_CELL_TYPES.includes(cell.type) || (cell.type === 'WALL' && cell.finalAsset === 'outer_corner')) {
                placeCovering('floor_2x2', u, u + 2, v, v + 2, 0, 0);
            }

            // --- DOORS & PORTCULLISES: facing N sits just south of the middle, facing E just west of it ---
            const doorKey = ['DOOR', 'LOCKED', 'TRAPPED', 'SECRET'].includes(cell.type) ? 'big_door'
                          : cell.type === 'PORTCULLIS' ? 'portcullis' : null;
            if (doorKey) {
                if (cell.finalFacing === 'E') placeCovering(doorKey, u + 0.5, u + 1, v, v + 2, 0.5, rot);
                else placeCovering(doorKey, u, u + 2, v + 1, v + 1.5, 0.5, rot);
            }

            // --- STAIRS: placeholder until stairs get their own step: two 1x1 stairs side by side across the middle ---
            if (cell.type === 'STAIRS') {
                if (cell.finalFacing === 'E') {
                    placeCovering('stairs', u + 0.5, u + 1.5, v, v + 1, 0.5, rot);
                    placeCovering('stairs', u + 0.5, u + 1.5, v + 1, v + 2, 0.5, rot);
                } else {
                    placeCovering('stairs', u, u + 1, v + 0.5, v + 1.5, 0.5, rot);
                    placeCovering('stairs', u + 1, u + 2, v + 0.5, v + 1.5, 0.5, rot);
                }
            }

            if (cell.type !== 'WALL') continue;

            // --- WALLS ---
            if (cell.finalAsset === 'wall_straight') {
                placeCovering('big_wall', u, u + 2, v, v + 2, 0, rot);
            }
            else if (cell.finalAsset === 'wall_corner') {
                placeCovering('big_corner', u, u + 2, v, v + 2, 0, rot);
            }
            else if (cell.finalAsset === 'outer_corner') {
                const sides = bigOuterCornerWalls(parsedGrid, x, y);
                if (sides.length === 0) {
                    // Both neighbouring walls reach this corner: the filler goes in the corner opposite the facing
                    const corner = OPPOSITE_CORNER[cell.finalFacing] || 'SW';
                    const fu = corner[1] === 'E' ? u + 1.5 : u;
                    const fv = corner[0] === 'S' ? v + 1.5 : v;
                    placeCovering('outer_corner', fu, fu + 0.5, fv, fv + 0.5, 0.5, rot);
                } else {
                    // A neighbouring wall is on the far edge: bridge it with a 2x1 wall along that side
                    for (const side of sides) {
                        if (side === 'N') placeCovering('wall_2x1', u, u + 2, v, v + 0.5, 0.5, ROTATIONS.N);
                        if (side === 'S') placeCovering('wall_2x1', u, u + 2, v + 1.5, v + 2, 0.5, ROTATIONS.S);
                        if (side === 'W') placeCovering('wall_2x1', u, u + 0.5, v, v + 2, 0.5, ROTATIONS.W);
                        if (side === 'E') placeCovering('wall_2x1', u + 1.5, u + 2, v, v + 2, 0.5, ROTATIONS.E);
                    }
                }
            }
            else if (cell.finalAsset === 'solid_block') {
                // Rock: four 2x1 walls side by side, half a tile up, no floor. Outer faces point outward.
                if (rockWallsRunNorthSouth(parsedGrid, x, y)) {
                    [0, 0.5, 1, 1.5].forEach((d, i) => placeCovering('wall_2x1', u + d, u + d + 0.5, v, v + 2, 0.5, ROTATIONS[i < 2 ? 'W' : 'E']));
                } else {
                    [0, 0.5, 1, 1.5].forEach((d, i) => placeCovering('wall_2x1', u, u + 2, v + d, v + d + 0.5, 0.5, ROTATIONS[i < 2 ? 'N' : 'S']));
                }
            }
        }
    }

    return finalizeSlabData();
}

function finalizeSlabData() {
    let cleanData = slabData.filter(group => group.assets.length > 0); 

    return cleanData; 
}