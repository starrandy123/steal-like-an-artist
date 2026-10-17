/* THE VENDORED three.js IS npm's three@0.183.1 (V14, 10-16: the glTF loader came in with the Blender Juno). Every vendored file, with the one
 * rewrite undone (examples/jsm/: its `} from 'three';` pointed at the vendored module — a page has no bare imports), hashes to npm's own file
 * (tests/vendor_three.json, taken from the npm package); no bare 'three' import is left; every relative import resolves to a vendored file. */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
const ROOT = new URL('..', import.meta.url).pathname, V = join(ROOT, 'build/vendor/three'), M = JSON.parse(readFileSync(join(ROOT, 'tests/vendor_three.json'), 'utf8'));
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
for (const [f, sha] of Object.entries(M.npm_sha256)) {
  const p = join(V, f); if (!existsSync(p)) { ok(false, f + ': not vendored'); continue; }
  let s = readFileSync(p, 'utf8'); const rew = f.startsWith(M.rewrite.in) ? s.split(M.rewrite.to).length - 1 : 0;
  if (rew) s = s.split(M.rewrite.to).join(M.rewrite.from);
  const h = createHash('sha256').update(s).digest('hex'), bare = (readFileSync(p, 'utf8').match(/from\s+'three'/g) || []).length;
  const rel = [...readFileSync(p, 'utf8').matchAll(/from\s+'(\.[^']+)'/g)].map((m) => m[1]), missing = rel.filter((r) => !existsSync(join(dirname(p), r)));
  ok(h === sha && bare === 0 && missing.length === 0, f + ': npm\'s ' + M.package + '@' + M.version + ' byte for byte' + (rew ? ' but its ' + rew + ' import line pointed at the vendored module' : '') + (h === sha ? '' : ' — DIFFERS from npm (sha ' + h.slice(0, 16) + ', npm ' + sha.slice(0, 16) + ')') + (bare ? ' — ' + bare + ' bare \'three\' imports left' : '') + (missing.length ? ' — imports nothing at ' + missing.join(', ') : ''));
}
console.log('VENDOR: ' + (fail ? 'RED · ' + fail : 'GREEN'));
process.exit(fail ? 1 : 0);
