# Donjon to Talespire Converter
Does pretty much what it says on the tin. Takes dungeons generated on [Donjon](https://donjon.bin.sh/) and converts them to a slab in talespire. 

# AI Disclaimer
I used **Gemini 3.1** to do a lot of the leg work for this. 

I don't know jack all about programing, though I have learned a lot through working on this. If anyone wants to review this and do it better than the AI (or fix problems I likely made while tweaking what the AI did) please do. Or if you want to send me angry DMs telling me how awful I am at code or to get better, you can do that too. I am hoping that by posting this online someone with enough spite in their heart will either do it better or tell me all the things I got wrong so I can make it better. 

# Additional Disclaimer
Neither I nor the AI produced any part of **talespireslabs.js**. I cut a different project in half when I first started this project; but I can't figure out which project on github it was, and I only partially even understand what it does. If anyone can find who made it, or can explain to me what its doing besides the compression math, please let me know. I want to give them credit. And probably also send them a thankyou card for making this possible. 

Also, this is my first github repository; so if I have broken some unspoken rule, or need to do something different, let me know. 

## How to Use
Its self Explanitory; but when I first started doing stuff I had no clue what I was looking at. If that's you, I'll explain it below:
1. [Donjon](https://donjon.bin.sh/5e5/dungeon/) and generate your dungeon.
2. Scroll to the bottom and download the JSON file.[^1]
3. Open '000 interface.html' in a web browser. It should be as easy as double clicking. If it opens to code, you may need to right click and select 'open with' followed by your browser.[^2] 
4. Select the .json you just downloaded
5. Click generate, then copy and paste the string in the box into talespire like any other slab. 

## How it Works
Here is where I show my work. Anyone who cares enough to read this, I would love feedback and/or comments. 
1. main.js calls the functions in order. 
2. donjonParser.js does most of the actual work. 
    - Converts bitshifted flags into useful terms
    - Checks Corridor lenghths to assign corridor score
    - Loops through each cell to determine what asset it should be, and which direction it should be facing(if applicable)
    - Hand that data to the debug tools as well as the slabBuilder.js
3. slabBuilder.js does very little. builds a array(matrix?) of each asset. The only real math/work this does is applying an offset to assets. After, it hands the now formatted information to talespireslabs.js
4. talespireslabs.js *supposedly* does a Gzip compression algorithm. I don't know. I figured out how it wanted the information packaged, then never even considered trying to change/adjust things. It serves as the cornerstone of this project. Whenever I open it, there are errors. Whenever I look at it, it seems to growl like an angry dog. Whoever made it must have done a lot of work; and I am glad because the terms "Gzip Compression Algorithm" and "Base64 Encoding" remind me that "any technology sufficiently advanced is indistinguishable from magic". It makes the string you copy and paste into Talespire.

## To Do
- [ ] Add "Set Dressing" so the dungeons don't look as barren
- [ ] Add "Trim Fat" setting to fuse 1x1 tiles into their 2x2 counter parts to use less assets.
- [ ] Update the slabBuilder to pull from a tileSets.json for different themes(Currently, things are hard coded for MegaDungeon)
- [ ] Add a "Big Mode" that treats all the tiles as 10x10 rather than 5x5[^3]
- [ ] Figure out .css so I can make the UI look a bit cleaner. 

# Notes
[^1]: I personally move this into the folder with everything else; but thats just for convinience. 
[^2]: I use Chrome, and have not tested if this works other places
[^3]: Currently, things are cramped on purpose, as its how I imagine Dungeons are; but they're also hard to use effectively as a DM. The final product of this will probably be using the "Big Mode" as the default, and a "Cramped Mode" as the toggle. 
