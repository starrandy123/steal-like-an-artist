# Kiln Yard's props and backdrop — where every piece came from

Kiln Yard (Waxline's second park) draws buildings round its fence that are **not** made in code. They are assembled from three of Poly Haven's
modular kits, fetched through the **Blender MCP** and built by our own script. Nothing else in Waxline is a downloaded asset.

## The licence (read at the source, polyhaven.com/license, 2026-10-16)
> "Our assets are all licensed as CC0." · "You do not need to give credit or attribution when using them (although it is appreciated)." ·
> "You can use our assets for any purpose, including commercial work." · "You can redistribute them, share them around, include them when
> sharing your own work, or even in a product you sell."

CC0 1.0 Universal: https://creativecommons.org/publicdomain/zero/1.0/ . We credit the authors anyway (`build/CREDITS.md`).

## The assets (Poly Haven's own records: api.polyhaven.com/info and /files; the .blend files downloaded again on 2026-10-16 and hashed here)

| Asset (id) | Author | Published | Licence | File used (1k) | Bytes | md5 (Poly Haven's record = ours) | sha256 (ours) |
|---|---|---|---|---|---|---|---|
| Modular Factory Facade (`modular_factory_facade`) | James Ray Cock | 2024-06-05 | CC0 | `modular_factory_facade_1k.blend` | 2,457,480 | dd6763bf48a5558e51c2ed9855a2cc93 | 7f4eaef1a85d87c90191c1e26ecc85d17bc634b656f7ee233e217efe55a8fa90 |
| Modular Urban Apartments Facade (`modular_urban_apartments_facade`) | James Ray Cock | 2024-05-27 | CC0 | `modular_urban_apartments_facade_1k.blend` | 1,599,439 | b96087f62fe03224993e4a8d52ea864b | f8cfe8858d3acbb3d99bd9974bd5b4bbdac04c8d947918ba21ec15f5d05bba64 |
| Modular Fire Escape (`modular_fire_escape`) | Juniix | 2023-09-13 | CC0 | `modular_fire_escape_1k.blend` | 393,477 | 7c1e38171ff7b6fab1aee42760afa3dc | 5c4435667e861a8c9550d07dec6dcb7086154ca4373eb598a10ef28707361b6b |
| Barrel 03 (`barrel_03`) | Serhii Khromov | 2021-09-22 | CC0 | `barrel_03_1k.blend` | 156,635 | 339aaaf78553c1f765d6f3811f5acecf | 13c957a33547241270dbe762ab5a7353195d669582dbffb64d5c75ad873c4604 |
| Old Tyre (`old_tyre`) | MP | 2023-10-30 | CC0 | `old_tyre_1k.blend` | 189,822 | d3db2845ae330c8834d90f52b8681dc8 | 1eac3e3e2f66dbb46f0e91b3aa8e612a36b86c18f310acc7870e8e01af757be2 |
| Wooden Crate 01 (`wooden_crate_01`) | James Ray Cock | 2022-02-25 | CC0 | `wooden_crate_01_1k.blend` | 263,450 | 9e8dbf019a10a3eb3c09ed678993b322 | 7279afbb41d4a4c199c6ebb77d534900ae24082b475525f4f3c7ecccd9b2b902 |
| Covered Car (`covered_car`) | MP | 2023-11-22 | CC0 | `covered_car_1k.blend` | 358,141 | c786a1ac9d41302043a04c8524d7a974 | 86a505c9fb8216d1542336906a0c7964d121af86bad7f6c8ff58e9e78b7f316c |

Each .blend's 1k textures (19, 14 and 8 PNGs) came with it from `dl.polyhaven.org`; their URLs, sizes and md5s are Poly Haven's `/files`
records (kept in the batch logs, `runs/02_backdrop/mcp.jsonl`). Only their base colour (and the windows' alpha) reaches the game, cut to
512 or 256 px.

## What we made from them — `build/assets/kilnyard_backdrop.glb`
sha256 `336e33044111591c6cdd3c8bfe981d1d19c5ea8832ae94c402cf9a57d29ebc1f` · 3.82 MB · 41,793 triangles · 11 textures (WebP).

- **The script:** `scripts/build_backdrop.py`, run inside Blender through the MCP's `execute_blender_code`. Only our own script files are
  sent, under safe mode.
- **The buildings:**
  - the warehouse behind the dock, three storeys of brick with its garage doors at the dock's height;
  - a factory;
  - the apartments, with fire escapes;
  - a shed;
  - a dark plane behind each facade.
- **What we kept and what we changed:**
  - placed from the kits' 3 m modules, wall by wall;
  - walls kept whole: their flat faces dissolved, which loses nothing (a 1,152-triangle wall becomes 2);
  - windows and doors made lighter (collapse decimation to 22%);
  - normal, roughness and metal maps dropped, their values made constants.
- **The wall:** `tests/backdrop.mjs` reads the GLB as the game loads it:
  - nothing inside the park's fence (a vertex planted inside goes RED);
  - ≤ 50k triangles, ≤ 8 MB of textures on the graphics card, none over 512²;
  - ≤ 5 MB on disk.

## The props inside the fence — `build/assets/kilnyard_props.glb`
sha256 `ee309d844ae40272ef5f1833e32390851a8e3efcb54060b02ade6ec200167c9c` · 218,692 bytes (10-17) · barrel 128 · tyre 256 (laid flat) · crate 12 ·
covered car 3,999 triangles · four textures (WebP): the three bakes at 512 px, the car's base colour at 256.

- **The barrel, the tyre and the crate are OUR OWN SHAPES, wearing their models' look (10-17).** A board can reach their tops, and orgo-u-62's
  support sweep found it sinking into the models' creases: the crate 17.0 cm, the tyre 20.7, the barrel 7.4. The supervisor's pre-ruling is a
  simpler mesh, drawn = collided.
  - **The shape is ours:** a drum, a ring laid flat and a box, made by `scripts/simplify_props.py` and fitted to each Poly Haven model's measured
    extent. Their tops are flat (a board seats on a plane), and 32 faces go round the drum and the ring (11.25° apart, under the sweep's 15°).
  - **The texture is baked from the Poly Haven model:** its base colour, and the shading of its own crevices (ambient occlusion over 10 cm), baked
    onto our shape (Cycles, selected to active) and multiplied into one 512 px image a kind. The bakes are kept in `runs/06_props_simple/`.
  - **No geometry of the models ships:** each is read once, for its bake.
- **The covered car is Poly Haven's model made light** (`scripts/build_props.py`): its parts joined in their own world frame, stood with its foot
  at y 0 and its middle on the origin, closed (open borders filled) and faced outward, smooth-shaded with sharp edges at 35°, decimated to its
  3,999 triangles, base colour at 256 px. It is the one kind left as it was: its top is 5 cm over the most a pop reaches (orgo-u-62, 10-17).
- **Collision is the drawn mesh, exactly:** `tools/props_col.mjs` writes each mesh's float32 positions and indices into
  `build/js/parks/kilnyard_props.js`, which the sim builds its collision from.
- **The walls:**
  - `tests/props.mjs`: bit for bit against the GLB (a 1 cm plant goes RED), and every placed prop met where it is drawn;
  - `tests/props_solid.mjs`: 24 rays from outside meet a face on every prop;
  - orgo-u-62's `tests/support.mjs --park kilnyard --prop-rows 0,1,2,3,4,5,7,8,9,10,11`: the board straddled across every edge of every prop a
    board can reach. 10-17: 0 seats over 1 cm (the barrels 21,120 seats, the crates 3,168, the tyres 16,896; the deepest 0.00 cm).
- **Left out, measured:** the hydrant and the trash bin (their decimated shells let rays through), and the utility box (wall-mounted, no back:
  filled, it came out twisted).

## The tool — the Blender MCP, headless (`tools/blender_mcp/`)
- **What it is:**
  - `mcp-for-blender` 2.1.9 (MIT, https://github.com/ahujasid/blender-mcp);
  - its addon `addon.py`, sha256 `eb0facf69781a30e69792532087d8d41c6a14fcd323353250abe7988ee297fa5`, byte-identical to the GitHub source and to
    the PyPI wheel; its `LICENSE` beside it.
- **How it runs:**
  - `headless.py` serves the addon's own queue in a background Blender (no window);
  - `client.py` drives the official MCP server over its stdio protocol;
  - `mcp_batch.sh` runs one batch, always inside `~/.mosa/heavy.sh`.
- **What it may do:**
  - `DISABLE_TELEMETRY=true`, `BLENDER_MCP_SAFE_MODE=true`, `--factory-startup --disable-autoexec`, 127.0.0.1 only, stopped after 600 s idle;
  - Poly Haven is the only integration switched on: no Sketchfab, no generators.

## The batches (`batches/`, each run by `tools/blender_mcp/mcp_batch.sh` inside `~/.mosa/heavy.sh`): which made which file
| Batch | What it does | Poly Haven assets it imports | Writes |
|---|---|---|---|
| `00_smoke.json` | the MCP answers (`get_scene_info`), Poly Haven's search works | — | nothing |
| `01_inspect.json` | the kits' modules measured (`scripts/inspect.py`) | modular_factory_facade, modular_urban_apartments_facade, rollershutter_door, modular_fire_escape | nothing (rollershutter_door was looked at and NOT used: it is in no file the game ships) |
| `02_backdrop.json` | the buildings (`scripts/build_backdrop.py`) | modular_factory_facade, modular_urban_apartments_facade, modular_fire_escape | `build/assets/kilnyard_backdrop.glb` |
| `03_diagnose.json`, `04_debug.json` | why the first backdrop's kit pieces landed off their places (`scripts/diagnose.py`, `scripts/debug_lighter.py`) | modular_factory_facade | nothing |
| `05_props.json` | the props (`scripts/build_props.py`, `scripts/tag_new.py`) | barrel_03, old_tyre, wooden_crate_01, covered_car | the FIRST `build/assets/kilnyard_props.glb` (sha256 `39e7de4d…`, 10-16), replaced by 06 |
| `06_props_simple.json` | the props again (10-17): the car as before; the barrel, the tyre and the crate made our own drum, ring and box, their models' look baked onto them (`scripts/build_props.py` with `SIMPLE`, `scripts/simplify_props.py`, `scripts/export_props.py`) | barrel_03, old_tyre, wooden_crate_01, covered_car | `build/assets/kilnyard_props.glb`, and its bakes in `runs/06_props_simple/` |

## For rights.json (the supervisor's upload)
One row an asset, kind `asset`, licence `CC0-1.0`, source `https://polyhaven.com/a/<id>`, author as in the table above, and the file it is in:
- `assets/kilnyard_backdrop.glb` — derived from modular_factory_facade and modular_urban_apartments_facade (James Ray Cock) and
  modular_fire_escape (Juniix): placed module by module, the walls' flat faces dissolved, windows and doors decimated to 22 %, normal,
  roughness and metal maps dropped for constants, colour textures WebP at most 512².
- `assets/kilnyard_props.glb` — the covered car is derived from covered_car (MP): joined, re-origined, closed and faced outward, smooth-shaded
  (sharp at 35°), decimated to 3,999 triangles, base colour at 256 px. The barrel, the tyre and the crate are OUR OWN shapes (a drum, a ring, a
  box) wearing textures BAKED from barrel_03 (Serhii Khromov), old_tyre (MP) and wooden_crate_01 (James Ray Cock): each model's base colour and
  its own crevices' shading at 512 px; no geometry of theirs ships. Their positions also become the collision data (`js/parks/kilnyard_props.js`,
  generated).
