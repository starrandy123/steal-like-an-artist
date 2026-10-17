/* A PROP'S PLACE (Kiln Yard's barrels, crates, the car…): ONE transform for what the board meets (sim/park.js: its triangles in the collision)
 * and what is drawn (view/parkview.js: the GLB's mesh at the same place) — a prop row is { kind, at: [x, y, z], rot: degrees about y }.
 * The turn is three.js's makeRotationY, written out: x' = x·cos + z·sin, z' = −x·sin + z·cos. Plain JS: the sim and the tests read it. */
export function propPoint(row, x, y, z) {
  const a = (row.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return [row.at[0] + c * x + s * z, row.at[1] + y, row.at[2] - s * x + c * z];
}
/* the 4×4 the view hands three.js (column-major, as Matrix4.fromArray reads it): the same turn and the same place */
export function propMatrix(row) {
  const a = (row.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, row.at[0], row.at[1], row.at[2], 1];
}
