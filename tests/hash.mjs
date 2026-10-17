/* NO SHADER HASHES ON sin() (10-16: sin of a large number loses its precision on a GPU and goes near constant over whole regions — the park's
 * marks came out bare in two of five views, and the skyline's random heights and lit windows repeated). Every GLSL source in the build is read
 * for `fract(sin(`; the one hash is surfaces.js WLHASH. */
import { readdirSync, readFileSync, statSync } from 'node:fs'; import { join } from 'node:path';
const root = new URL('../build/js/', import.meta.url).pathname, bad = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith('.js')) readFileSync(p, 'utf8').split('\n').forEach((l, i) => { if (/fract\(\s*sin\(/.test(l)) bad.push(p.slice(root.length) + ':' + (i + 1)); }); } }; walk(root);
console.log((bad.length ? '✖ ' : '✔ ') + 'shader hashes on sin(): ' + (bad.length ? bad.join(', ') : 'none'));
console.log(bad.length ? 'HASH: RED' : 'HASH: GREEN'); process.exit(bad.length ? 1 : 0);
