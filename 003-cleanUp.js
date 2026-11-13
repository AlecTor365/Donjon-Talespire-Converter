// ==========================================
// CLEANUP: LEAVING OUT CELLS THAT DON'T NEED ASSETS
// ==========================================
// Runs after the parser (002-donjonParser.js) and before the slab builder (005-slabBuilder.js).
// gridTrim runs when "Trim outside rock" is ticked; the merge planning runs when "Merge floors & walls" is ticked.
// Cells marked isTrimmed = true are skipped by the builder and shown dark in the debugger.

// Deep rock: a wall cell with no open space touching it, not even diagonally.
// The parser labels these cells "0W_0D_solid".
function isDeepRock(cell) {
    return cell.debugId === '0W_0D_solid';
}

// ==========================================
// GRID TRIM
// ==========================================
// Removes the rock outside the dungeon's outline.
// Each row is scanned from the left and from the right, and each column from the top and from the bottom.
// Every deep rock cell is trimmed until the scan reaches the first cell that isn't deep rock.
// Rock between rooms is never reached, so the dungeon keeps its shape.
// With keepOuterRing, trimmed cells on the map's very edge are kept as a plain floor instead (isRing),
// so the slab keeps a rectangular outline.
function gridTrim(parsedGrid, keepOuterRing) {
    const rows = parsedGrid.length;
    const cols = parsedGrid[0].length;
    let trimmedCount = 0;

    function trim(cell) {
        if (!cell.isTrimmed) {
            cell.isTrimmed = true;
            trimmedCount++;
        }
    }

    // 1. Rows: left to right, then right to left
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols && isDeepRock(parsedGrid[y][x]); x++) {
            trim(parsedGrid[y][x]);
        }
        for (let x = cols - 1; x >= 0 && isDeepRock(parsedGrid[y][x]); x--) {
            trim(parsedGrid[y][x]);
        }
    }

    // 2. Columns: top to bottom, then bottom to top
    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows && isDeepRock(parsedGrid[y][x]); y++) {
            trim(parsedGrid[y][x]);
        }
        for (let y = rows - 1; y >= 0 && isDeepRock(parsedGrid[y][x]); y--) {
            trim(parsedGrid[y][x]);
        }
    }

    // 3. Outer Ring: bring the map's edge cells back as plain floors
    if (keepOuterRing) {
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const onEdge = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
                const cell = parsedGrid[y][x];
                if (onEdge && cell.isTrimmed) {
                    cell.isTrimmed = false;
                    cell.isRing = true;
                    trimmedCount--;
                }
            }
        }
    }

    return trimmedCount;
}

// ==========================================
// MERGE PLANNING
// ==========================================
// Decides which cells share bigger pieces. Everything here is in map cells;
// 005-slabBuilder.js turns each plan into slab positions.
//
// - Floors: a grid of 2x2 floors over the whole map, with 1x2 / 1x1 pieces where the map edge cuts it.
//   Grid pieces that touch a trimmed cell are dropped, and any cell that still needs floor is patched.
// - Outer walls (next to a trimmed cell or the map edge) and all inner corners keep the combined
//   wall + floor pieces, so the floor never has to reach past the dungeon's edge.
// - Inner straight walls become wall-only pieces, two cells long where two neighbours face the same way.
// - Rock: two rock cells side by side become two 2x1 walls back to back. A lone rock cell keeps its blocks.

const FLOOR_CELL_TYPES = ['ROOM', 'CORRIDOR', 'DOOR', 'LOCKED', 'TRAPPED', 'SECRET', 'PORTCULLIS', 'STAIRS', 'ARCH'];

function isKeptCell(parsedGrid, x, y) {
    return y >= 0 && x >= 0 && y < parsedGrid.length && x < parsedGrid[0].length && !parsedGrid[y][x].isTrimmed;
}

// Rock between rooms (outer ring cells are rock too, but they only get a plain floor)
function isRockCell(cell) {
    return cell.type === 'WALL' && cell.finalAsset === 'solid_block' && !cell.isRing;
}

// A wall on the dungeon's edge: one of its four neighbours is trimmed or off the map
function isOuterWall(parsedGrid, x, y) {
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !isKeptCell(parsedGrid, x + dx, y + dy));
}

// Uses a combined wall + floor piece, so it brings its own floor
function usesCombinedWall(parsedGrid, x, y) {
    const cell = parsedGrid[y][x];
    if (cell.type !== 'WALL') return false;
    if (cell.finalAsset === 'wall_corner') return true;
    return cell.finalAsset === 'wall_straight' && isOuterWall(parsedGrid, x, y);
}

// Cells that must end up with floor under them (rock and combined walls don't)
function cellNeedsFloor(parsedGrid, x, y) {
    if (!isKeptCell(parsedGrid, x, y)) return false;
    const cell = parsedGrid[y][x];
    if (cell.isRing) return true;
    if (FLOOR_CELL_TYPES.includes(cell.type)) return true;
    if (cell.type !== 'WALL') return false;
    if (cell.finalAsset === 'outer_corner') return true;   // the corner filler has no floor of its own
    return cell.finalAsset === 'wall_straight' && !usesCombinedWall(parsedGrid, x, y);
}

// Floor grid. shiftX / shiftY (0 or 1) move where the 2x2 grid starts; the best shift depends on the map.
// Returns pieces as { x, y, w, d }: w cells east-west, d cells north-south, starting at cell (x, y).
function planFloorGrid(parsedGrid, shiftX, shiftY) {
    const rows = parsedGrid.length;
    const cols = parsedGrid[0].length;
    const pieces = [];
    const patch = Array.from({ length: rows }, () => Array(cols).fill(false));

    for (let y0 = -shiftY; y0 < rows; y0 += 2) {
        for (let x0 = -shiftX; x0 < cols; x0 += 2) {
            const xMin = Math.max(x0, 0), xMax = Math.min(x0 + 1, cols - 1);
            const yMin = Math.max(y0, 0), yMax = Math.min(y0 + 1, rows - 1);
            const cells = [];
            for (let y = yMin; y <= yMax; y++) for (let x = xMin; x <= xMax; x++) cells.push([x, y]);

            if (cells.every(([x, y]) => isKeptCell(parsedGrid, x, y))) {
                pieces.push({ x: xMin, y: yMin, w: xMax - xMin + 1, d: yMax - yMin + 1 });
            } else {
                // Cut by the trim edge: drop the piece, and patch whatever under it still needs floor
                cells.forEach(([x, y]) => { if (cellNeedsFloor(parsedGrid, x, y)) patch[y][x] = true; });
            }
        }
    }

    // Patch: pair neighbours into 1x2 pieces where possible, otherwise 1x1
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (!patch[y][x]) continue;
            patch[y][x] = false;
            if (x + 1 < cols && patch[y][x + 1]) { patch[y][x + 1] = false; pieces.push({ x, y, w: 2, d: 1 }); }
            else if (y + 1 < rows && patch[y + 1][x]) { patch[y + 1][x] = false; pieces.push({ x, y, w: 1, d: 2 }); }
            else pieces.push({ x, y, w: 1, d: 1 });
        }
    }
    return pieces;
}

// Inner straight walls, paired along the wall line. Returns { x, y, length, facing } starting at cell (x, y):
// N/S walls run east-west, E/W walls run north-south.
function planInnerWalls(parsedGrid) {
    const rows = parsedGrid.length;
    const cols = parsedGrid[0].length;
    const isInnerWall = (x, y) => isKeptCell(parsedGrid, x, y) && parsedGrid[y][x].type === 'WALL'
        && parsedGrid[y][x].finalAsset === 'wall_straight' && !usesCombinedWall(parsedGrid, x, y);
    const used = Array.from({ length: rows }, () => Array(cols).fill(false));
    const walls = [];

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (!isInnerWall(x, y) || used[y][x]) continue;
            used[y][x] = true;
            const facing = parsedGrid[y][x].finalFacing;
            const [nx, ny] = (facing === 'N' || facing === 'S') ? [x + 1, y] : [x, y + 1];
            const pairs = isInnerWall(nx, ny) && !used[ny][nx] && parsedGrid[ny][nx].finalFacing === facing;
            if (pairs) used[ny][nx] = true;
            walls.push({ x, y, length: pairs ? 2 : 1, facing });
        }
    }
    return walls;
}

// Big Mode rock is four 2x1 walls side by side. Their flat faces should face the open side, so the walls
// run north-south when more open (non-rock) cells touch the rock cell's east and west sides than its north and south.
function rockWallsRunNorthSouth(parsedGrid, x, y) {
    const isOpen = (nx, ny) => isKeptCell(parsedGrid, nx, ny) && !isRockCell(parsedGrid[ny][nx]) && !parsedGrid[ny][nx].isRing;
    const eastWest = isOpen(x + 1, y) + isOpen(x - 1, y);
    const northSouth = isOpen(x, y + 1) + isOpen(x, y - 1);
    return eastWest > northSouth;
}

// Big Mode outer corners. An outer corner facing XY is open to X and Y; its other two sides touch wall cells.
// Each neighbouring straight wall either reaches the corner cell next to the corner (where a small filler joins
// it to the other wall) or along the far edge. A far-edge wall needs a 2x1 wall along that side of the corner
// cell to reach the other one. Returns the sides of the corner cell that need a wall; none means the filler is enough.
const OPPOSITE_SIDE = { N: 'S', S: 'N', E: 'W', W: 'E' };
const SIDE_STEP = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
function bigOuterCornerWalls(parsedGrid, x, y) {
    const facing = parsedGrid[y][x].finalFacing;
    const openNS = facing[0], openEW = facing[1];
    const backNS = OPPOSITE_SIDE[openNS], backEW = OPPOSITE_SIDE[openEW];
    const wallFacing = side => {
        const [dx, dy] = SIDE_STEP[side];
        if (!isKeptCell(parsedGrid, x + dx, y + dy)) return null;
        const n = parsedGrid[y + dy][x + dx];
        return (n.type === 'WALL' && n.finalAsset === 'wall_straight') ? n.finalFacing : null;
    };
    const sides = [];
    if (wallFacing(backEW) === openNS) sides.push(backEW);   // side neighbour's wall runs along the far (open) edge
    if (wallFacing(backNS) === openEW) sides.push(backNS);   // neighbour below/above has its wall on the far edge
    return sides;
}

// Rock cells: pairs side by side (east-west first, then north-south) and lone cells
function planRock(parsedGrid) {
    const rows = parsedGrid.length;
    const cols = parsedGrid[0].length;
    const isRock = (x, y) => isKeptCell(parsedGrid, x, y) && isRockCell(parsedGrid[y][x]);
    const used = Array.from({ length: rows }, () => Array(cols).fill(false));
    const pairs = [], singles = [];

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (!isRock(x, y) || used[y][x]) continue;
            used[y][x] = true;
            if (isRock(x + 1, y) && !used[y][x + 1]) { used[y][x + 1] = true; pairs.push({ x, y, horizontal: true }); }
            else if (isRock(x, y + 1) && !used[y + 1][x]) { used[y + 1][x] = true; pairs.push({ x, y, horizontal: false }); }
            else singles.push({ x, y });
        }
    }
    return { pairs, singles };
}
