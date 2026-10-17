/* THE COPING SET (tests/coping_capture.mjs, tests/outcomes.mjs): lip airs from the Basin's floor at each of its four walls, square and 25° and
 * 40° either side; off the Deck Quarter, the East Wall and the Lawn Quarter at the same slants; over the Spine from each side — at two speeds
 * each. A case: { set: 'straight' | 'slanted', name, at, heading, speed } */
const SLANTS = [-40, -25, 25, 40];
export const CASES = [];
const add = (set, name, at, heading, speeds) => { for (const sp of speeds) CASES.push({ set, name: name + ' @' + sp, at, heading, speed: sp }); };
for (const [nm, h] of [['the Basin\'s north wall', 0], ['east wall', 90], ['south wall', 180], ['west wall', 270]]) {
  add('straight', 'Basin, ' + nm, [9, -1.83, 10], h, [6.5, 8.5]);
  for (const d of SLANTS) add('slanted', 'Basin, ' + nm + ' ' + (d > 0 ? '+' : '') + d + '°', [9, -1.83, 10], (h + d + 360) % 360, [6.5, 8.5]);
}
for (const [nm, at, h] of [['Deck Quarter', [31, 0.8, 38], 270], ['East Wall', [50.5, 0, 16], 90], ['Lawn Quarter', [6, 0, 24], 270]]) {
  add('straight', nm, at, h, [7, 9]);
  for (const d of SLANTS) add('slanted', nm + ' ' + (d > 0 ? '+' : '') + d + '°', at, (h + d + 360) % 360, [7.5, 9]);
}
for (const [nm, at, h] of [['the Spine from the east', [14.5, 0, 24], 270], ['the Spine from the west', [4.2, 0, 24], 90]]) {
  add('straight', nm, at, h, [6.5, 8.5]);
  for (const d of [-25, 25]) add('slanted', nm + ' ' + (d > 0 ? '+' : '') + d + '°', at, (h + d + 360) % 360, [6.5, 8.5]);
}
