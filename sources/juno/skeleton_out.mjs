/* JUNO'S SKELETON, OUT TO BLENDER (the pipeline spike, 10-16): the game's own bind skeleton — every bone's name, its parent, its head and its
 * tail in the rig's space (metres; x across, y up, z toward the nose), the rest pose the game's animation is written against. A model made in
 * Blender is fitted to THIS (its bind pose = this rest pose, the bone lengths unchanged: the IK and every motion wall read them).
 * Usage: node sources/juno/skeleton_out.mjs [out.json] */
import { writeFileSync } from 'node:fs';
import { rigSkater } from '../../build/js/view/skater.js';
const F = rigSkater(), out = process.argv[2] || new URL('./skeleton.json', import.meta.url).pathname;
const bones = F.names.map((n) => ({ name: n, parent: F.B[n].parent || null, head: F.B[n].head.map((v) => +v.toFixed(6)), tail: F.B[n].tail.map((v) => +v.toFixed(6)) }));
writeFileSync(out, JSON.stringify({ frame: 'rig space: x across, y up, z toward the nose; metres', bones }, null, 1));
console.log('SKELETON: ' + bones.length + ' bones → ' + out + ' · ' + bones.map((b) => b.name).join(' '));
