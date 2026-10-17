# Waxline — credits

**Waxline** is an original game by Mosaic, the NotesMosaic house studio, under the MIT licence (`LICENSE`).

## Made in code — all but Kiln Yard's buildings and props
Nothing in Waxline is an image, model or audio file except the buildings and props of Kiln Yard (below). When the game starts it builds:
- **the parks**: every ramp, bowl, ledge, rail, stair and wall of the Plaza and of Kiln Yard, from their rows in `js/parks/` (`js/sim/park.js`);
- **every surface**: concrete, pavers, granite, steel, coping, grass and the rest are painted on the graphics card from small
  shader functions (`js/view/surfaces.js`); the grime, the wax on the ledges and the worn lanes are drawn from the park's own layout;
- **the light and the sky**, with the city painted into the sky (`js/view/stage.js`);
- **the trees, the grass tufts and the shrubs**: leaf and blade textures drawn on canvases, crowns of leaf cards (`js/view/trees.js`);
- **the board**: deck, plies, grip, trucks and wheels (`js/view/board.js`);
- **Juno, the skater**: sculpted from distance fields, meshed, simplified and skinned to his own skeleton (`js/view/sculpt.js`,
  `js/view/skater.js`);
- **every sound**: synthesized live with the Web Audio API (`js/audio/audio.js`).

## Kiln Yard's buildings and props (CC0)
The warehouse, the factory, the apartments, their fire escapes and the shed round Kiln Yard (`assets/kilnyard_backdrop.glb`) are built by
our own script from three of **Poly Haven**'s modular kits, all **CC0**: *Modular Factory Facade* and *Modular Urban Apartments Facade* by
**James Ray Cock**, *Modular Fire Escape* by **Juniix**. In the yard (`assets/kilnyard_props.glb`), the covered car is Poly Haven's *Covered
Car* by **MP**, and the barrel, the tyre and the crate are our own shapes wearing textures baked from Poly Haven's *Barrel 03* by **Serhii
Khromov**, *Old Tyre* by **MP** and *Wooden Crate 01* by **James Ray Cock**, all **CC0** (polyhaven.com).
Licence and sources: `licenses/polyhaven-CC0.txt`.

## Libraries
- **three.js** r183 (0.183.1) — MIT, © 2010–2026 three.js authors. Licence: `licenses/three-LICENSE.txt`.
- **The NotesMosaic port kit** (`mosa-port.js`, 1.2.1+s2) — public domain / MIT-0.

## Methods we learned from
- The flick reader resamples a stroke and reads it against templates, the method of Wobbrock, Wilson and Li, *Gestures without
  Libraries, Toolkits or Training: A $1 Recognizer for User Interface Prototypes* (UIST 2007). Our code is our own.
- The mesh simplifier is the quadric error metric of Garland and Heckbert, *Surface Simplification Using Quadric Error Metrics*
  (SIGGRAPH 1997). Our code is our own.
- Surface nets meshing (Gibson 1998). Our code is our own.

No other game's code, art, sounds, names, park layouts or branding are in Waxline. The design notes and the sources of every number
are in `DESIGN.md` and `CLEANROOM.md` (with the source, not shipped in the build).
