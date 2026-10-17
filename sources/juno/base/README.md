# The base body (third-party, CC0) — recorded before use

| | |
|---|---|
| What | Blender Studio's **Human Base Meshes v1.4.1** (the asset bundle) |
| Where | the page https://www.blender.org/download/demo-files/ (its Asset Bundles), which links https://www.blender.org/download/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.4.1.zip — that answers with a "Thanks!" page whose link is the file itself: https://mirror.blender.org/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.4.1.zip |
| The page says | "Human Base Meshes v1.4.1" · "49 MB – CC0" · "Requires Blender 4.2 LTS or newer" · "Updated: Jan 20, 2025" |
| The zip's own entries are dated | 2026-01-20 (the folder and the .blend) — a year after the page's "Updated" line; both are as found, neither corrected |
| Fetched | 2026-10-16, for the owner's pick ("Blender's free base body") |
| `zip/human-base-meshes-bundle-v1.4.1.zip` | 50,643,039 bytes · sha256 `811f43accbb31a88266d932f8f5563b2d13586fca0ba2693aad1f5fe582b3515` |
| `unzipped/human-base-meshes-bundle-v1.4.1/human_base_meshes_bundle.blend` | 49,420,489 bytes · sha256 `3c121505651140ceb4d69fd1d8923f7788ffadd81672f5be14845a5f2c75c137` |
| The licence's text | `CC0-1.0-legalcode.txt` (from https://creativecommons.org/publicdomain/zero/1.0/legalcode.txt · sha256 `a2010f343487d3f7618affe54f789f5487602331c0a8d03f49e9a7c547cf0499`) — the bundle itself carries no licence file; its page states CC0 |

**The rules this folder keeps:** a downloaded `.blend` is untrusted — it stays in this folder, it is only ever opened through
`sources/juno/blender.sh` (which always passes `-b --factory-startup --disable-autoexec`), and the scripts that read it live outside this folder
(`sources/juno/*.py`). Nothing here ships: only what
our scripts derive from the BODY goes to `build/`. Only the base body is third-party; the clothes, the hair, the face's detail, the textures and
every prop are ours. What it holds (read by `sources/juno/inspect_base.py`, nothing in it run): `GEO-body_male_realistic` 10,582 vertices,
21,160 triangles, 1.69 m, an A-pose, a multires modifier; `GEO-body_male_stylized` 12,502 vertices, 25,000 triangles, 1.80 m; separate
eyes; female bodies, heads, hands, feet, skulls, primitives.
