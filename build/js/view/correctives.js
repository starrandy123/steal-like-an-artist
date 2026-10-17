/* THE JOINTS' CORRECTIVES (V14, 10-16): blended matrices collapse a joint at a deep bend (the knees kept 66 % of their flesh in a 5-0), so
 * the character's pipeline (sources/juno/export_juno.py) makes, at a few bends past rest, a morph that lays the flesh back — named
 * `<joint>_<degrees>` (kneeL_90 …). This is the ONE rule that sets them, read by the page and by the walls alike: a joint's bend is the angle
 * between its two bones' lines, less the same at rest; its keys are read off the morph names a mesh carries; between two keys a bend sets
 * both, by how near it is to each; below the first key, the first by its share of it; past the last, the last whole. */
export const JOINTS = { kneeL: ['thighL', 'shinL'], kneeR: ['thighR', 'shinR'], elbowL: ['armL', 'foreL'], elbowR: ['armR', 'foreR'] };

/* a mesh's keys for a joint, from its morph names: [[degrees, name], …] ascending */
export function keysOf(names, joint) {
  return names.filter((k) => k.startsWith(joint + '_') && /^\d+$/.test(k.slice(joint.length + 1))).map((k) => [+k.slice(joint.length + 1), k]).sort((a, b) => a[0] - b[0]);
}

/* the weights of a joint's keys at a bend (degrees past rest): { name: weight } — at most two non-zero, summing to 1 from the first key on */
export function keyWeights(keys, bend) {
  const w = {}; for (const [, n] of keys) w[n] = 0;
  if (!keys.length || !(bend > 0)) return w;
  if (bend <= keys[0][0]) { w[keys[0][1]] = bend / keys[0][0]; return w; }
  for (let i = 0; i + 1 < keys.length; i++) {
    const [a, na] = keys[i], [b, nb] = keys[i + 1];
    if (bend <= b) { const t = (bend - a) / (b - a); w[na] = 1 - t; w[nb] = t; return w; }
  }
  w[keys[keys.length - 1][1]] = 1; return w;
}

/* the angle (degrees) between two lines given as unit vectors {x, y, z} */
export const angleOf = (u, v) => (Math.acos(Math.max(-1, Math.min(1, u.x * v.x + u.y * v.y + u.z * v.z))) * 180) / Math.PI;
