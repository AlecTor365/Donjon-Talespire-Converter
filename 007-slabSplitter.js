// ==========================================
// SPLIT DUNGEON
// ==========================================
// Runs after the slab is built, when "Split Dungeon" is ticked. If the TaleSpire string is too long to paste,
// the finished slab is cut into equal-size parts, each with its own string. The layouts are tried in order:
// 1 part, 2 (cut across the longer side), 4 (quadrants), 6, 9, 12, 16, and the first one where every part fits is used.
// Each piece goes wholly into the part that holds the middle of its footprint, so nothing is doubled or missing.

// [parts along the longer side, parts along the shorter side]
const SPLIT_LAYOUTS = [[1, 1], [2, 1], [2, 2], [3, 2], [3, 3], [4, 3], [4, 4]];

// Where to cut a side of 'size' cells into 'count' equal parts. With 'parity' (0 or 1), each cut is moved to the
// nearest cell line of that parity, so cuts follow the merged 2x2 floor grid and never cut a floor in half.
function splitCutPositions(size, count, parity) {
    const cuts = [0];
    for (let i = 1; i < count; i++) {
        let cut = Math.round(size * i / count);
        if (parity !== null && cut % 2 !== parity) cut += 1;
        cuts.push(Math.min(Math.max(cut, 1), size - 1));
    }
    cuts.push(size);
    return cuts;
}

// Readable part names: "Left", "Top right", "Middle", and so on
function splitPartName(i, j, across, down) {
    const NAMES = { 1: [''], 2: ['Left', 'Right'], 3: ['Left', 'Middle', 'Right'], 4: ['Far left', 'Left', 'Right', 'Far right'] };
    const ROW_NAMES = { 1: [''], 2: ['Top', 'Bottom'], 3: ['Top', 'Middle', 'Bottom'], 4: ['Top', 'Upper middle', 'Lower middle', 'Bottom'] };
    const rowName = ROW_NAMES[down][j], colName = NAMES[across][i];
    if (rowName === 'Middle' && colName === 'Middle') return 'Centre';
    const name = [rowName, colName.toLowerCase()].filter(Boolean).join(' ');
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Whole dungeon';
}

// slabData: the finished slab. cols/rows: map size in Donjon cells. tilesPerCell: 1, or 2 in Big Mode.
// gridParity: { x, y } cut parities for merged floors, or null. limit: the longest string allowed per part.
// Uses the builder's current offsetX/offsetY, so call it right after building this slab.
// Returns [{ name, x0, x1, y0, y1 (cells), slab, string }].
function splitSlab(slabData, cols, rows, tilesPerCell, gridParity, limit) {
    // Footprint middle of every piece, in map cells, using the corner rule from the test slabs
    const sizes = {};
    for (const key in ASSET_IDS) sizes[ASSET_IDS[key].id] = ASSET_IDS[key];
    const pieces = [];
    for (const group of slabData) {
        const size = sizes[group.nguid] || { x: 1, z: 1 };
        for (const asset of group.assets) {
            const turned = Math.abs(asset.rotation) === 6;
            const sx = turned ? size.z : size.x, sz = turned ? size.x : size.z;
            const middleU = offsetX + 1 - asset.bounds.center.x - sx / 2;   // slab x is mirrored
            const middleV = asset.bounds.center.z + offsetY + sz / 2;
            pieces.push({ nguid: group.nguid, asset, cellX: middleU / tilesPerCell, cellY: middleV / tilesPerCell });
        }
    }

    let parts = [];
    for (const [longParts, shortParts] of SPLIT_LAYOUTS) {
        const across = cols >= rows ? longParts : shortParts;
        const down = cols >= rows ? shortParts : longParts;
        const xCuts = splitCutPositions(cols, across, gridParity ? gridParity.x : null);
        const yCuts = splitCutPositions(rows, down, gridParity ? gridParity.y : null);
        const findPart = (cuts, value) => { let i = 0; while (i < cuts.length - 2 && value >= cuts[i + 1]) i++; return i; };

        const groupsByPart = Array.from({ length: across * down }, () => ({}));
        for (const piece of pieces) {
            const i = findPart(xCuts, piece.cellX), j = findPart(yCuts, piece.cellY);
            const groups = groupsByPart[j * across + i];
            (groups[piece.nguid] = groups[piece.nguid] || []).push(piece.asset);
        }

        parts = [];
        for (let j = 0; j < down; j++) {
            for (let i = 0; i < across; i++) {
                const groups = groupsByPart[j * across + i];
                const slab = Object.entries(groups).map(([nguid, assets]) => ({ nguid, assets }));
                if (!slab.length) continue;   // nothing in this part (for example all trimmed rock)
                parts.push({ name: splitPartName(i, j, across, down), x0: xCuts[i], x1: xCuts[i + 1], y0: yCuts[j], y1: yCuts[j + 1], slab, string: TalespireSlabs.CreateSlab(slab) });
            }
        }
        if (parts.every(part => part.string.length <= limit)) break;
    }
    return parts;
}
