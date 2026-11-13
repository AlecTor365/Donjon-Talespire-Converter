# Donjon to Talespire Converter
Does pretty much what it says on the tin. Takes dungeons generated on [Donjon](https://donjon.bin.sh/) and converts them to a slab in talespire. 

## How to Use
Its self Explanitory; but when I first started doing stuff I had no clue what I was looking at. If that's you, I'll explain it below:
1. [Donjon](https://donjon.bin.sh/5e5/dungeon/) and generate your dungeon.
2. Scroll to the bottom and download the JSON file.[^1]
3. Open 'index.html' in a web browser. It should be as easy as double clicking. If it opens to code, you may need to right click and select 'open with' followed by your browser.[^2] 
4. Select the .json you just downloaded
5. Click generate, then copy and paste the string in the box into talespire like any other slab. 

### New Features
- Dynamic Themes: Pick from MegaDungeon or BellowGloom, with more coming!
- Cool Sleek UI: Wow, a broken Debug Menu? You shouldn't have. Really. 
- Fat Trimming: Get rid of the excess Cells, and merge like assets to bigger one(If anyone at BouncyRock sees this, please add a 3x3 floor, or a 4x4 floor that isn't textured)
- A Few Dungeons: Mama always said, don't give a man an empty wallet. Never sure what that meant but I figured this was kinda close. 

## How it Works
Here is where I show my work. Anyone who cares enough to read this, I would love feedback and/or comments. 
1. 001-main.js calls the functions in order. 
2. 002-donjonParser.js does most of the actual work. 
    - Converts bitshifted flags into useful terms
    - Checks Corridor lenghths to assign corridor score
    - Loops through each cell to determine what asset it should be, and which direction it should be facing(if applicable)
    - Hand that data to the debug tools as well as the 005-slabBuilder.js
3. 003-cleanUp.js is a new addition; adding the gridTrim feature to get rid of all the dead assets. Tiles surrounding the dungeon that can easily be trimmed without losing anything important, or the dungeon shape. It does a grid search starting from left to right, then right to left, then top to bottom and bottom to top. It stops at the first cell it finds that is not deep earth, marks it, and goes to the next row. This way we can get rid of everything but keep the basic silloette of the space. I chose this over a floodfill since it seemed easier conceptually. I haven't tested this on a ton of map types, and I suspect that Dagger and some others will end up looking weird. 
This is also where we prep the greedy mesh to merge like cells. 
4. 004-themePicker.js currently holds all the tilesets, and it gets read whenever you click the Generate Slab button. Not much going on here *yet.*
5. 005-slabBuilder.js does very little. Gets the theme from 004-themePicker.js, then builds a array(matrix?) of each asset. The only real math/work this does is applying an offset to assets. After, it hands the now formatted information to 006-talespireslabs.js
6. 006-talespireslabs.js [^Slabs] *supposedly* does a Gzip compression algorithm. I don't know. I figured out how it wanted the information packaged, then never even considered trying to change/adjust things. It serves as the cornerstone of this project. Whenever I open it, there are errors. Whenever I look at it, it seems to growl like an angry dog. Whoever made it must have done a lot of work; and I am glad because the terms "Gzip Compression Algorithm" and "Base64 Encoding" remind me that "any technology sufficiently advanced is indistinguishable from magic". It makes the string you copy and paste into Talespire. Edit: I learned that it adds magic characters to the front of the string, and the character it adds is "0xD1CEFACE" which spells Dice Face. A nice touch by bouncyRock. 
7. 007-slabSplitter.js adds a whole new feature and solves the same thing the trim did(kinda). If a slab is larger than 30kb, I have added a feature to split it into parts. Its optional, and can all be toggled on and off. It adds tabs and highlights the grid section you are copying so you know where to place it. 

### Talespireslabs.js
So; we updated this. I have a better understanding of it; but I'll never claim any sort of ownership of this one. It is pulling from libraries I couldn't understand to do math far above my skillset as a glorified secratary in a middle management position. I want to say I figured out who made the original, Pillar of the Community LordAshes! If you're here, you very likely already know him, but if you don't please go check out his stuff because it is way better than this. [^Slabs]

## To Do
- [ ] Add "Set Dressing" so the dungeons don't look as barren
- [ ] Add Randomized Rotations to Assets that look stale if all placed identically(Looking at you BellowGloom)
- [ ] Add Asset Catalogue for personallizing themes
- [ ] Expand avaliable Themes
- [ ] Fix the Debug menu to show what floors are, and merge cells that are merged in the map
- [ ] Figure out .css so I can make the UI look a bit cleaner

# AI Disclaimer
I used **Gemini 3.1** to help me through learning the core code for this, then **Opus 5.5** to build the QoL features. 

I don't know jack all about programing, though I have learned a lot through working on this. I wouldn't say that I coded this, the most I can say is I edited it after it was made; and ride on the coattails of those before me. Like a washed up coach of a highschool football team.[^3]

If anyone wants to review this and do it better than the AI (or fix problems I likely made while tweaking what the AI did) please do. Or if you want to send me angry DMs telling me how awful I am at code or to get better, you can do that too(Discord is in my bio). I am hoping that by posting this online someone with enough spite(or care) in their heart will either do it better or tell me all the things I got wrong so I can make it better. 

# Notes
[^1]: I personally move this into the folder with everything else; but thats just for convinience. 
[^2]: I use Chrome, and have not tested if this works other places
[^3]: I changed to Opus after my brother recomended I try it out. The AI is way better at coding, and also can actually read my stuff and make changes in real time. This has been great for efficiency, and terrible for the Learning Process. It's gone from something I felt like a co-writer on to something I feel like I commissioned. The Product is good, but I feel hollow and distant from it all. At this point, its a tool more than anything else. 