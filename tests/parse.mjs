/* EVERY SCRIPT THE PAGE LOADS PARSES, AS THE PAGE PARSES IT (10-16: a backtick inside a GLSL comment closed its template string, and `node
 * --check` passed the .js file; the page then never booted. 10-17: a credits line in port.js — a CLASSIC script the page loads beside its
 * modules — broke the boot, and no wall read it: this one walked build/js only). The list is the page's own (build/index.html): every classic
 * script, a file or inline, compiled as a classic script (vm.Script); every module, the page's and every one under build/js, imported as the
 * page imports it — a syntax error rejects with SyntaxError; a module that only fails for want of a page (document, window) parsed fine. */
import { readdirSync, statSync, readFileSync } from 'node:fs'; import { join } from 'node:path'; import { pathToFileURL } from 'node:url'; import vm from 'node:vm';
const build = new URL('../build/', import.meta.url).pathname, root = join(build, 'js/'), files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith('.js')) files.push(p); } }; walk(root);
let bad = 0;
/* the page's own scripts: the classic ones compiled as classic scripts, its modules added to the ones imported */
const classic = [];
for (const m of readFileSync(join(build, 'index.html'), 'utf8').matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
  const src = (m[1].match(/src="([^"]+)"/) || [])[1];
  if (/type="module"/.test(m[1])) { if (src) files.push(join(build, src)); continue; }
  classic.push(src ? { name: src, code: readFileSync(join(build, src), 'utf8') } : { name: 'index.html (inline)', code: m[2] });
}
for (const c of classic) { try { new vm.Script(c.code, { filename: c.name }); } catch (e) { bad++; console.log('✖ ' + c.name + ' (a classic script the page loads): ' + e.message); } }
const modules = [...new Set(files)];
for (const f of modules) { try { await import(pathToFileURL(f).href); } catch (e) { if (e instanceof SyntaxError || e.name === 'SyntaxError') { bad++; console.log('✖ ' + f.slice(root.length) + ': ' + e.message); } } }
console.log((bad ? '✖ ' : '✔ ') + classic.length + ' classic scripts of the page compiled and ' + modules.length + ' modules imported, ' + bad + ' that do not parse');
console.log(bad ? 'PARSE: RED' : 'PARSE: GREEN'); process.exit(bad ? 1 : 0);
