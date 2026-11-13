// Each asset stores its ID and its full size in tiles (x = width, y = height, z = depth),
// taken from TaleSpire's asset index. The slab builder writes half of each size as the extents.
const tileSets =  {
    MegaDungeon: {
        ASSET_IDS : {
            floor:         { id: "940d013f-c982-43e7-922a-0317cc1c74db", x: 1,   y: 0.5, z: 1   }, // md_floor_1x1_01
            portcullis:    { id: "fcb7a2fe-4b79-4d0a-b1fd-31e4b17ffaf5", x: 2,   y: 2,   z: 0.5 }, // Door - Portcullis
            door:          { id: "3151e230-bac7-401e-8fa8-b993bbee17ea", x: 1,   y: 2,   z: 0.5 }, // Door - Dungeon
            wall_straight: { id: "c8312af8-8bfb-41e1-bb6e-30280686b168", x: 1,   y: 2.5, z: 1   }, // md_pref_wall_1x1_01
            wall_corner:   { id: "0820791e-c1a8-4a1e-b690-f34b0cb276ba", x: 1,   y: 2.5, z: 1   }, // md_wall_corner_1x1_01
            outer_corner:  { id: "bb8e7378-44da-4556-bac5-92420f766815", x: 0.5, y: 2,   z: 0.5 }, // md_corner_filler_01
            solid_block:   { id: "0252d209-c23c-4f72-aa8b-51ed0dc09f3a", x: 1,   y: 1,   z: 1   }, // md_stairblock_01
            stairs:        { id: "f4a32f18-e4ce-4dd3-baec-cdd3da36c28e", x: 1,   y: 1,   z: 1   }, // md_stairs_01
            // Pieces used when merging (see 003-cleanUp.js). Wall pieces here have no floor attached.
            floor_1x2:     { id: "a9671ddd-d670-426c-b986-bdba4e37dd06", x: 1,   y: 0.5, z: 2   }, // md_floor_2x1_01 (runs north-south)
            floor_2x2:     { id: "a3645a02-ba42-4711-9959-0bee2bf1bb82", x: 2,   y: 0.5, z: 2   }, // md_floor_2x2_01
            wall_1x1:      { id: "56e2633d-bbce-4eea-bde7-cb7c34b636f1", x: 1,   y: 2,   z: 0.5 }, // md_wall_1x1_01
            wall_2x1:      { id: "eea7b9e2-b30c-43f3-95fb-0db4a6720d45", x: 2,   y: 2,   z: 0.5 }, // md_wall_2x1_01
            // Big Mode pieces (one Donjon cell = 2x2 tiles)
            big_wall:      { id: "e74bb2f0-8135-41fa-8f6d-fe50f4b82d3d", x: 2,   y: 2.5, z: 2   }, // md_pref_wall_2x1_01 (2x2 floor + wall)
            big_corner:    { id: "ec2cef5b-19e1-44e2-8f57-7efea8fe3224", x: 2,   y: 2.5, z: 2   }, // md_wall_floor_corner_2x2_01
            big_door:      { id: "e963aa2f-ec17-4841-9887-721c9d37161d", x: 2,   y: 2,   z: 0.5 }  // Doors - Dungeon Double
        },
        DRESSING : { // Planned Use in Set Dressing Feature
            low_spawn : [
                {key: "Mushroom Patch (Forest) 01", Id: "efc30073-0bc0-4380-9da5-27fcaa16c02f"},
                {key: "Root 02",Id: "db207ea0-97f0-4c43-88c5-8fa0c78801a5"}
            ],
            medium_spawn : [
                {key : "Rubble Rocks L 01", Id : "1b066055-231c-436d-86dc-632ce351b350"},
                {key: "Rubble Rocks spread out 01", Id: "aaa853d2-370e-4ffb-aec6-0043046bfb53"},
                {key: "Root 03", Id: "80c2e070-10eb-4608-87a7-fa3d75e929c2"}
            ],
            high_spawn : [
                {key: "Rubble pebbles spread out", Id: "ac288dec-372b-4c7a-b70f-3a48115920ab"}
            ]
        }
    },
    BellowGloom: {
        ASSET_IDS : {
            floor:         { id: "83b31a56-ea61-4246-82b0-07692527ac76", x: 1,   y: 0.5, z: 1   }, // bg_floor_1x1_01
            portcullis:    { id: "fcb7a2fe-4b79-4d0a-b1fd-31e4b17ffaf5", x: 2,   y: 2,   z: 0.5 }, // Door - Portcullis
            door:          { id: "63c8488e-e0b6-4d75-9f0c-97163f77edbc", x: 1,   y: 2,   z: 0.5 }, // Door - Prison
            wall_straight: { id: "3c34f2f9-ba5e-4d75-95b5-17e6b7bc4ee2", x: 1,   y: 2.5, z: 1   }, // bg_combo_1x1_01
            wall_corner:   { id: "27bf03a4-a0e0-4dbe-b955-ce5460c614b4", x: 1,   y: 2.5, z: 1   }, // bg_combo_1x1_corner_01
            outer_corner:  { id: "02e0bfd1-af67-4de9-a2e7-9af942852615", x: 0.5, y: 2,   z: 0.5 }, // bg_filler_01
            solid_block:   { id: "239dad98-4a2e-4460-9c01-401a58431f14", x: 1,   y: 1,   z: 1   }, // bg_stairblock_01
            stairs:        { id: "b7bfe16c-8731-424b-a880-5c0e09280bf8", x: 1,   y: 1,   z: 1   }, // bg_stairs_01
            // Pieces used when merging (see 003-cleanUp.js). Wall pieces here have no floor attached.
            floor_1x2:     { id: "925500fe-075a-42a0-8b01-eb535e2595a3", x: 2,   y: 0.5, z: 1   }, // bg_floor_1x2_01 (runs east-west)
            floor_2x2:     { id: "0fc0a09b-35fa-4d8f-9397-3639f4404b8a", x: 2,   y: 0.5, z: 2   }, // bg_floor_2x2_01
            wall_1x1:      { id: "00cdf63c-ab62-4643-9dcb-0dacf713ba3e", x: 1,   y: 2,   z: 0.5 }, // bg_wall_1x1_01
            wall_2x1:      { id: "fc8455a4-b4b1-4ee5-82da-fc4f709671f1", x: 2,   y: 2,   z: 0.5 }, // bg_wall_1x2_01
            // Big Mode pieces (one Donjon cell = 2x2 tiles)
            big_wall:      { id: "deba933f-c778-4175-985f-fb29ee18edae", x: 2,   y: 2.5, z: 2   }, // bg_combo_1x2_01 (2x2 floor + wall)
            big_corner:    { id: "551e54a7-f2e6-40bf-a2d4-814392993b88", x: 2,   y: 2.5, z: 2   }, // bg_combol_2x2_corner_02
            big_door:      { id: "4711521a-5996-4c0c-aaaa-2a4a20c5731e", x: 2,   y: 2,   z: 0.5 }  // Door - Prison double
        },
    }
}

const DEFAULT_PREFABS = {
    "Door_Prefab": [
        { key: "door", y_bump: 0.5, inherits_rotation: true, N: {z : 0.5} , E: {x : -0.5} }
    ],
    "Portcullis_Prefab": [
        { key: "portcullis", y_bump: 0.5, inherits_rotation: true, N: {z : 0.5} , E: {x : -0.5} }
    ],
    "Solid_Prefab": [
        { key: "solid_block", y_bump: 0.5, inherits_rotation: false },
        { key: "solid_block", y_bump: 1.5, inherits_rotation: false }
    ],
    "outer_corner_Prefab": [
        // SW is the asset's default position, so it needs no offset entry
        { key: "outer_corner", y_bump: 0.5, inherits_rotation: true, NE: {x : -0.5, z : 0.5}, SE: {x : -0.5}, NW: {z: 0.5} }
    ],
    "Stairs_Prefab": [
        { key: "stairs", y_bump: 0.5, inherits_rotation: true }
    ]
};

let ASSET_IDS, PREFABS;

function applyTileSet(name) {
    const selectedData = tileSets[name];
    ASSET_IDS = selectedData.ASSET_IDS;
    PREFABS = { ...DEFAULT_PREFABS, ...selectedData.PREFABS }; // The theme's versions win
}

applyTileSet('MegaDungeon');

document.addEventListener('DOMContentLoaded', () => {
  const dropdown = document.getElementById('tileSetDropdown');

  // 1. Extract the keys directly from the global tileSets variable
  const tileSetNames = Object.keys(tileSets);

  // 2. Loop through the keys and build the <option> elements
  tileSetNames.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    dropdown.appendChild(option);
  });

  // 3. Force "MegaDungeon" to be the default selected value
  dropdown.value = 'MegaDungeon';

  // 4. Optional: Add the event listener for when the user changes the dropdown
  dropdown.addEventListener('change', (event) => {
    const selectedName = event.target.value;
    applyTileSet(selectedName);
    console.log(`You selected ${selectedName}`, tileSets[selectedName]);
  });
});