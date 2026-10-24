const tileSets =  {
    MegaDungeon: {
        EXTENDS :{ x: 1, y: 1, z: 1 },
        ASSET_IDS : { 
            floor: "940d013f-c982-43e7-922a-0317cc1c74db", 
            portcullis: "fcb7a2fe-4b79-4d0a-b1fd-31e4b17ffaf5", 
            door: "3151e230-bac7-401e-8fa8-b993bbee17ea", 
            wall_straight: "c8312af8-8bfb-41e1-bb6e-30280686b168", 
            wall_corner: "0820791e-c1a8-4a1e-b690-f34b0cb276ba",
            outer_corner: "bb8e7378-44da-4556-bac5-92420f766815",
            solid_block: "0252d209-c23c-4f72-aa8b-51ed0dc09f3a", 
            stairs : "f4a32f18-e4ce-4dd3-baec-cdd3da36c28e"
        },
        PREFABS : { 
            "Door_Prefab": [ 
                { key: "floor", y_bump: 0.0, inherits_rotation: false },
                { key: "door", y_bump: 0.5, inherits_rotation: true, N: {z : 0.5} , E: {x : -0.5} } 
            ], 
            "Portcullis_Prefab": [ 
                { key: "floor", y_bump: 0.0, inherits_rotation: false },
                { key: "portcullis", y_bump: 0.5, inherits_rotation: true, N: {z : 0.5} , E: {x : -0.5} } 
            ],
            "Solid_Prefab": [ 
                { key: "floor", y_bump: 0.0, inherits_rotation: false },
                { key: "solid_block", y_bump: 0.5, inherits_rotation: false },
                { key: "solid_block", y_bump: 1.5, inherits_rotation: false }
            ],
            "outer_corner_Prefab": [ 
            { key: "floor", y_bump: 0.0, inherits_rotation: false },
            { key: "outer_corner", y_bump: 0.5, inherits_rotation: true, NE: {x : -0.5, z : 0.5}, SE: {x : -0.5}, NW: {z: 0.5} }
            ],
            "Stairs_Prefab": [ 
            { key: "floor", y_bump: 0.0, inherits_rotation: false },
            { key: "stairs", y_bump: 0.5, inherits_rotation: true }
            ]
        },
        DRESSING : {
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
        EXTENDS :{ x: 1, y: 1, z: 1 },
        ASSET_IDS : { 
            floor: "83b31a56-ea61-4246-82b0-07692527ac76", 
            portcullis: "fcb7a2fe-4b79-4d0a-b1fd-31e4b17ffaf5", 
            door: "63c8488e-e0b6-4d75-9f0c-97163f77edbc", 
            wall_straight: "3c34f2f9-ba5e-4d75-95b5-17e6b7bc4ee2", 
            wall_corner: "27bf03a4-a0e0-4dbe-b955-ce5460c614b4",
            outer_corner: "02e0bfd1-af67-4de9-a2e7-9af942852615",
            solid_block: "239dad98-4a2e-4460-9c01-401a58431f14", 
            stairs : "b7bfe16c-8731-424b-a880-5c0e09280bf8"
        },
        PREFABS : { 
            "Door_Prefab": [ 
                { key: "floor", y_bump: 0.0, inherits_rotation: false },
                { key: "door", y_bump: 0.5, inherits_rotation: true, N: {z : 0.5} , E: {x : -0.5} } 
            ], 
            "Portcullis_Prefab": [ 
                { key: "floor", y_bump: 0.0, inherits_rotation: false },
                { key: "portcullis", y_bump: 0.5, inherits_rotation: true, N: {z : 0.5} , E: {x : -0.5} } 
            ],
            "Solid_Prefab": [ 
                { key: "floor", y_bump: 0.0, inherits_rotation: false },
                { key: "solid_block", y_bump: 0.5, inherits_rotation: false },
                { key: "solid_block", y_bump: 1.5, inherits_rotation: false }
            ],
            "outer_corner_Prefab": [ 
            { key: "floor", y_bump: 0.0, inherits_rotation: false },
            { key: "outer_corner", y_bump: 0.5, inherits_rotation: true, NE: {x : -0.5, z : 0.5}, SE: {x : -0.5}, NW: {z: 0.5} }
            ],
            "Stairs_Prefab": [ 
            { key: "floor", y_bump: 0.0, inherits_rotation: false },
            { key: "stairs", y_bump: 0.5, inherits_rotation: true }
            ]
        },
    }
}

let { ASSET_IDS, PREFABS, EXTENDS } = tileSets.MegaDungeon; // New Line

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
    const selectedData = tileSets[selectedName];
    ({ ASSET_IDS, PREFABS, EXTENDS } = selectedData); // New Line
    console.log(`You selected ${selectedName}`, selectedData);
  });
});