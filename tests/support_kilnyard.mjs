/* KILN YARD'S OWN EDGES, held to the Plaza's bar (the supervisor, 10-17: "A park that ships is held to the bar"): tests/support.mjs on Kiln
 * Yard with its props apart (their tops are read by their own rows: a reachable top ≤ 1 cm passes, ≤ 2 cm is named, deeper takes a simpler
 * mesh, drawn = collided; the car's top is unreachable by 5 cm, named). run_all lists files, not arguments: this file hands them on. */
process.argv.push('--park', 'kilnyard', '--no-props');
await import('./support.mjs');
