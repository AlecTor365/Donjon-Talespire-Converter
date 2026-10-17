// ==========================================
// DONJON BITMASK CONSTANTS
// ==========================================
const FLAG_NOTHING = 0;
const FLAG_BLOCK = 1;            // Solid Earth / Deep Rock
const FLAG_ROOM = 2;             // Walkable Room
const FLAG_CORRIDOR = 4;         // Walkable Corridor
const FLAG_PERIMETER = 16;       // Base Wall
const FLAG_APERTURE = 32;        // Window/Hole
const FLAG_ARCH = 65536;         // Archway
const FLAG_DOOR = 131072;        // Standard Door
const FLAG_LOCKED = 262144;      // Locked Door
const FLAG_TRAPPED = 524288;     // Trapped Door
const FLAG_SECRET = 1048576;     // Secret Door
const FLAG_PORTCULLIS = 2097152; // Portcullis
const FLAG_STAIR_DOWN = 4194304; // Stairs Down
const FLAG_STAIR_UP = 8388608;   // Stairs Up

// Extracts the primary structural tile type from Donjon's bitmask
function getTopValue(val) {
    // 1. (Architechture)
    if (val & FLAG_PORTCULLIS) return 'PORTCULLIS';
    if (val & FLAG_SECRET) return 'SECRET';
    if (val & FLAG_TRAPPED) return 'TRAPPED';
    if (val & FLAG_LOCKED) return 'LOCKED';
    if (val & FLAG_DOOR) return 'DOOR';
    if (val & FLAG_ARCH) return 'ARCH';
    if (val & FLAG_APERTURE) return 'APERTURE';
    if (val & FLAG_STAIR_UP) return 'STAIRS';
    if (val & FLAG_STAIR_DOWN) return 'STAIRS';
    
    // 2. Walkable Floors
    if (val & FLAG_ROOM) return 'ROOM';
    if (val & FLAG_CORRIDOR) return 'CORRIDOR';
    
    // 3. Structural Boundaries
    if (val & FLAG_PERIMETER) return 'WALL';
    
    // 4. Default Fallback
    return 'WALL'; 
}

// ==========================================
// Walkable FUNCTION
// ==========================================
function isWalkable(type) {
    return ['ROOM', 'CORRIDOR', 'ARCH'].includes(type);
}

// ==========================================
// PASS 1: BASE GEOMETRY SETUP
// ==========================================
function parseMapData(rawMatrix) {
    const rows = rawMatrix.length;
    const cols = rawMatrix[0].length;
    
    let parsedGrid = Array.from({ length: rows }, () => Array(cols).fill(null));

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const rawVal = rawMatrix[y][x];
            const cellType = getTopValue(rawVal);
            
            // Extract the specific room_id if it's a room
            let roomId = null;
            if (cellType === 'ROOM') {
                roomId = rawVal >> 6; 
            }

            parsedGrid[y][x] = {
                x: x,
                y: y,
                raw: rawVal,
                type: cellType,
                roomId: roomId,
                corridorScore: 0,      
                finalAsset: null,      
                finalFacing: null,     
                debugId: "unprocessed"
            };
        }
    }
    return parsedGrid;
}

// ==========================================
// PASS 2: CORRIDOR LENGTH SCORING
// ==========================================
function runFloodFill(parsedGrid) {
    const rows = parsedGrid.length;
    const cols = parsedGrid[0].length;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let cell = parsedGrid[y][x];

            // Only score Walkable Corridors
            if (cell.type === 'CORRIDOR') {
                
                // 1. Measure Horizontal
                let horizontalScore = 1; 
                for (let wx = x - 1; wx >= 0 && parsedGrid[y][wx].type === 'CORRIDOR'; wx--) {
                    horizontalScore++;
                }
                for (let ex = x + 1; ex < cols && parsedGrid[y][ex].type === 'CORRIDOR'; ex++) {
                    horizontalScore++;
                }

                // 2. Measure Vertical
                let verticalScore = 1; 
                for (let ny = y - 1; ny >= 0 && parsedGrid[ny][x].type === 'CORRIDOR'; ny--) {
                    verticalScore++;
                }
                for (let sy = y + 1; sy < rows && parsedGrid[sy][x].type === 'CORRIDOR'; sy++) {
                    verticalScore++;
                }

                // 3. Assign the longest straight line score
                cell.corridorScore = Math.max(horizontalScore, verticalScore);
            }
        }
    }
    return parsedGrid;
}

// ==========================================
// PASS 3: GEOMETRY EVALUATION (The Switch)
// ==========================================
function evaluateGeometry(parsedGrid) {
    const rows = parsedGrid.length;
    const cols = parsedGrid[0].length;

    const orthogonals = [
        { name: 'N', dy: -1, dx: 0, opp: 'S' },
        { name: 'S', dy: 1, dx: 0,  opp: 'N' },
        { name: 'E', dy: 0, dx: 1,  opp: 'W' },
        { name: 'W', dy: 0, dx: -1, opp: 'E' }
    ];

    const diagonals = [
        { name: 'NE', dy: -1, dx: 1,  opp: 'SW' },
        { name: 'SE', dy: 1,  dx: 1,  opp: 'NW' },
        { name: 'SW', dy: 1,  dx: -1, opp: 'NE' },
        { name: 'NW', dy: -1, dx: -1, opp: 'SE' }
    ];

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let cell = parsedGrid[y][x];

            // -----------------------------------------------------
            // EVALUATE DOORS & PORTCULLISES & STAIRS
            // -----------------------------------------------------
            let isDoorType = ['DOOR', 'LOCKED', 'TRAPPED', 'SECRET', 'PORTCULLIS', 'STAIRS'].includes(cell.type); // Removed 'ARCH'
            
            if (isDoorType) {
                // Check North/South vs East/West passages
                let hasNorthSouthWalkable = false;
                let hasEastWestWalkable = false;

                for (let dir of orthogonals) {
                    let ny = y + dir.dy;
                    let nx = x + dir.dx;
                    if (ny >= 0 && ny < rows && nx >= 0 && nx < cols && isWalkable(parsedGrid[ny][nx].type)) {
                        if (dir.name === 'N' || dir.name === 'S') hasNorthSouthWalkable = true;
                        if (dir.name === 'E' || dir.name === 'W') hasEastWestWalkable = true;
                    }
                }

                // If walkables are East/West, the door must face East/West to span the gap
                cell.finalFacing = (hasEastWestWalkable && !hasNorthSouthWalkable) ? 'E' : 'N';
                cell.debugId = `door_facing_${cell.finalFacing}`;
                continue;
            }

            // New check: If any neighbor is a door type, set as solid_block
            let nearDoor = orthogonals.some(dir => {
                let ny = y + dir.dy, nx = x + dir.dx;
                return ny >= 0 && ny < rows && nx >= 0 && nx < cols && ['DOOR', 'LOCKED', 'TRAPPED', 'SECRET', 'PORTCULLIS', 'STAIRS'].includes(parsedGrid[ny][nx].type);
            });
            if (nearDoor) {
                cell.finalAsset = "solid_block";
                cell.finalFacing = "None";
                cell.debugId = "near_door_solid";
                continue;
            }

            // If it's not a Wall or a Door, skip geometry evaluation
            if (cell.type !== 'WALL') continue;

            // 1. The Orthogonal Sweep
            let walkables = [];
            let nonWalkables = [];

            for (let dir of orthogonals) {
                let ny = y + dir.dy;
                let nx = x + dir.dx;

                if (ny >= 0 && ny < rows && nx >= 0 && nx < cols) {
                    let neighborCell = parsedGrid[ny][nx];
                    if (isWalkable(neighborCell.type)) {
                        walkables.push({ dir: dir, cell: neighborCell });
                    } else {
                        nonWalkables.push(dir);
                    }
                } else {
                    nonWalkables.push(dir); // Out of bounds is void
                }
            }

            let orthoCount = walkables.length;

            // 2. The Logic Gates
            switch (orthoCount) {
                
                case 0: // DEEP EARTH OR INNER CORNERS
                    let diagWalkables = [];
                    for (let diag of diagonals) {
                        let ny = y + diag.dy;
                        let nx = x + diag.dx;
                        if (ny >= 0 && ny < rows && nx >= 0 && nx < cols) {
                            if (isWalkable(parsedGrid[ny][nx].type)) diagWalkables.push(diag);
                        }
                    }

                    if (diagWalkables.length === 0) {
                        cell.finalAsset = "solid_block";
                        cell.finalFacing = "None";
                        cell.debugId = "0W_0D_solid";
                    } 
                    else if (diagWalkables.length === 1) {
                        cell.finalAsset = "wall_corner";
                        cell.finalFacing = diagWalkables[0].opp; 
                        cell.debugId = `0W_1D_${diagWalkables[0].name}`;
                    } 
                    else {
                        cell.finalAsset = "solid_block";
                        cell.finalFacing = "None";
                        cell.debugId = `0W_multiD_solid`;
                    }
                    break;

                case 1: // STANDARD STRAIGHT WALL
                    cell.finalAsset = "wall_straight";
                    cell.finalFacing = walkables[0].dir.opp; 
                    cell.debugId = `1W_flat_${walkables[0].dir.name}`;
                    break;

                case 2: // CORNERS & PINCHES
                    let w1 = walkables[0];
                    let w2 = walkables[1];
                    let isOpposite = (w1.dir.name === 'N' && w2.dir.name === 'S') || 
                                     (w1.dir.name === 'E' && w2.dir.name === 'W');

                    if (!isOpposite) {
                        // ADJACENT Outer Corner
                        cell.finalAsset = "outer_corner";
                        let faceName = (w1.dir.name === 'N' || w2.dir.name === 'N') ? 'N' : 'S';
                        faceName += (w1.dir.name === 'E' || w2.dir.name === 'E') ? 'E' : 'W';
                        cell.finalFacing = faceName;
                        cell.debugId = `2W_adj_${faceName}`;
                    } 
                    else {
                        // OPPOSITE Pinch
                        if (w1.cell.type === 'ROOM' && w2.cell.type === 'ROOM') {
                            cell.finalAsset = "solid_block";
                            cell.finalFacing = "None";
                            cell.debugId = "2W_opp_RmRm_solid";
                        } 
                        else if (w1.cell.type === 'ROOM' || w2.cell.type === 'ROOM') {
                            cell.finalAsset = "wall_straight";
                            cell.finalFacing = (w1.cell.type === 'ROOM') ? w1.dir.name : w2.dir.name; 
                            cell.debugId = "2W_opp_RmCor_winRoom";
                        } 
                        else {
                            // Corridor vs Corridor: Length Score Battle
                            if (w1.cell.corridorScore > w2.cell.corridorScore) {
                                cell.finalAsset = "wall_straight";
                                cell.finalFacing = w2.dir.name; 
                                cell.debugId = `2W_opp_CorCor_win${w1.dir.name}`;
                            } 
                            else if (w2.cell.corridorScore > w1.cell.corridorScore) {
                                cell.finalAsset = "wall_straight";
                                cell.finalFacing = w1.dir.name; 
                                cell.debugId = `2W_opp_CorCor_win${w2.dir.name}`;
                            } 
                            else {
                                cell.finalAsset = "solid_block";
                                cell.finalFacing = "None";
                                cell.debugId = "2W_opp_CorCor_tie_solid";
                            }
                        }
                    }
                    break;

                case 3: // PENINSULA / T-INTERSECT
                    cell.finalAsset = "wall_straight";
                    cell.finalFacing = nonWalkables[0].name; 
                    cell.debugId = `3W_pen_face${nonWalkables[0].name}`;
                    break;

                case 4: // ISLAND PILLAR
                    cell.finalAsset = "solid_block";
                    cell.finalFacing = "None";
                    cell.debugId = "4W_island_all";
                    break;
            }
        }
    }
    return parsedGrid;
}

// ==========================================
// MASTER EXECUTOR
// ==========================================
function processDungeonMap(rawMatrix) {
    let grid = parseMapData(rawMatrix);      // Pass 1
    grid = runFloodFill(grid);               // Pass 2
    grid = evaluateGeometry(grid);           // Pass 3
    return grid;
}