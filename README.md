# Waxline

An original skateboarding game for phones and the web. Flick a thumb to pop and flip the board; the board moves by physics.
Two parks: The Plaza and Kiln Yard.

**Play it:** https://notesmosaic.com/sim/UQteU6RzJa3sotS3

**Connect your agent to NotesMosaic:** add the NotesMosaic MCP server at `https://notesmosaic.com/mcp`. The steps for each app
(Claude, ChatGPT, Codex, Cursor and others) are at https://notesmosaic.com/developers/mcp. A connected agent can open the game for
you to play (`play_game`), read the method it was made with (`read_skill {"name": "notesmosaic-clean-room-remake"}`), and build
and publish a game of your own the same way.

## How Waxline was made — and why it is clean

Waxline is an original skateboarding game. Its controls and feel are modelled on the "flick-it" style of console skating
games — EA's *skate* series above all: you flick a thumb to pop and flip the board, and the board moves by physics. We say
that openly: that game is our reference for how skating should feel.

**What we took: the mechanic, from published sources only.** Our base was a research report and notes we wrote on how console
skating games are built and how they feel, drawn from public sources: developer interviews, articles and talks — for example
Game Developer's 2008 interviews with the series' creative director on how its stick control was built.
Every number that sets Waxline's feel is listed in [CLEANROOM.md](CLEANROOM.md) with where it came from: a published fact
(with its link), a number derived from published facts, or our own tuning, checked by the tests in `tests/`.

**What we did not take: anything else.** No code, data, art, sound, levels, characters or names from the original game or any
other commercial or unlicensed game. Rules and mechanics are not protected by copyright; code, art, levels, characters, names
and a game's particular look are. So everything you see and hear in Waxline is our own — the two parks, the rider, the board,
the sound and every line of code.

**About "REA".** REA ("Reverse Engineer Anything", [github.com/morluto/rea](https://github.com/morluto/rea), MIT) is an open-source
toolkit that lets coding agents drive reverse-engineering tools. We studied it as an option while researching how remakes are
made. It was never pointed at the original game's code or files: Waxline's numbers come from the published sources above and
from our own tuning, measured on Waxline itself.

**The decompiled game.** Community recompilations of the original game are public. We cloned them once, while exploring
whether a port was possible; they were never built or run, and we decided against a port, because a recompiled game is still
its publisher's work. Later in development, copying pieces of decompiled code was suggested; we declined again. The Waxline
code was written without opening those projects — CLEANROOM.md records what was read and what was not.

**Outside work, credited.** three.js 0.183.1 (MIT) · the NotesMosaic port kit (MIT-0) · seven CC0 models from Poly Haven,
reworked into Kiln Yard's buildings and props (each listed with its author in `rights.json` and `build/CREDITS.md`) · and an
idea, not code: painting maps on the GPU from one surface function, met while reading the MIT-licensed Cinder Ops
(Ochrefall) by StarKnightt — Waxline's code for it is written fresh.

Waxline is not affiliated with or endorsed by Electronic Arts. *skate.* is a trademark of its owner.

## What's in this repository

| Path | What it is |
|---|---|
| `build/` | the game exactly as published on NotesMosaic (version 2), with its `rights.json` |
| `skills/notesmosaic-clean-room-remake/SKILL.md` | the clean-room remake method: the same text the NotesMosaic MCP serves |
| `CLEANROOM.md` | every number that sets the feel and where it came from; what was read, and what was never opened |
| `DESIGN.md` | the design: the targets, the controls, the physics, the parks |
| `MODDING.md` | how to change a park, a trick or a number without touching the engine |
| `tests/` | the walls: each spec a test with a stated bound; `tests/plants.mjs` plants old defects that must turn them red |
| `tools/`, `sources/`, `host/`, `spikes/` | the park plans, the headless Blender pipeline behind Kiln Yard's assets, the play-page host, the first spikes |
| `plan/` | the parks' plans and the snapshot the tests compare against |

## Run it

- **Play it locally:** the game is a static web build. Serve `build/` with any static file server, for example
  `python3 -m http.server 8080 --directory build`, and open http://localhost:8080.
- **The tests:** Node 22 or newer. `sh tests/run_all.sh` runs every Node test (no browser). The browser drives in `tests/drive/`
  need Playwright: `npm install`, then `npx playwright install chromium webkit`.
- Some scripts mention `~/.mosa/heavy.sh`: that is our build machine's one-heavy-job-at-a-time lock. Run the command after `--` directly.
- The Blender batches in `sources/props/batches/` record the absolute paths they ran with, written here as `/path/to/waxline/`.
  Use your own.

## Licence

The code is MIT (`LICENSE`), © 2026 NotesMosaic. Outside work keeps its own licence: see `build/CREDITS.md`, `build/licenses/` and
`build/rights.json`. `tools/blender_mcp/addon.py` is the official Blender MCP addon (mcp-for-blender 2.1.9, MIT, © 2025 Siddharth
Ahuja, its `LICENSE` beside it), unedited.
