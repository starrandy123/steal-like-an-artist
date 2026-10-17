/* builds the claude.ai play page FROM the build: index.html's own body (its loading screen, the game's containers and scripts), the
 * game's stylesheet inlined (the host takes stylesheets only inline), the host shim, and a stamp of what this build is. Copies the
 * build's own files, byte for byte, beside it. Usage: node host/make_page.mjs <out dir> */
import fs from 'node:fs'; import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname), build = path.join(here, '..', 'build'), out = path.resolve(process.argv[2] || path.join(here, 'out'));
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(path.join(build, 'index.html'), 'utf8');
const head = html.slice(0, html.indexOf('</head>')), headStyle = head.match(/<style>([\s\S]*?)<\/style>/)[1];
const body = html.slice(html.indexOf('</head>') + 7).replace(/^\s*<body>/, '').replace(/<\/body>\s*<\/html>\s*$/, '');
if (/<\/?(head|body|html)\b/.test(body)) throw new Error('the body still holds a document tag');
const css = fs.readFileSync(path.join(build, 'css', 'waxline.css'), 'utf8');
const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
const hostCss = `/* the host's corner: Record my flicks, small, clear of the title and of Juno */
.wl-host { position: fixed; right: max(12px, env(safe-area-inset-right)); bottom: max(12px, env(safe-area-inset-bottom)); display: grid; justify-items: end; gap: 4px; max-width: 60vw; }
.wl-host .wl-chip { min-height: 44px; font-size: 13px; background: rgba(21, 19, 15, 0.62); }
.wl-host .wl-chip[disabled] { display: none; }
.wl-host span { font: 500 12px/1.3 var(--sans); color: rgba(255, 244, 228, 0.78); text-align: right; }
.wl-hostline { max-width: min(92vw, 720px); margin: 0; font: 500 12px/1.45 var(--sans); color: rgba(255, 244, 228, 0.72); }`;
const page = `<title>Waxline</title>
<style>
${headStyle}
${css}
${hostCss}
</style>
<!-- Waxline play build ${stamp} · the game's own files, unchanged; host/shim.js adds the host's line and "Record my flicks" -->
${body.replace('<script src="port.js"></script>', '<script src="host/shim.js"></script>\n<script src="port.js"></script>').replace('<link rel="stylesheet" href="css/waxline.css">', '')}
`;
fs.writeFileSync(path.join(out, 'index.html'), page);
/* the build's files, as they are */
const files = {};
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f), rel = path.relative(build, p); if (fs.statSync(p).isDirectory()) walk(p); else if (!/^index\.html$|^css\//.test(rel)) { fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true }); fs.copyFileSync(p, path.join(out, rel)); files[rel] = path.join(out, rel); } } };
walk(build);
fs.mkdirSync(path.join(out, 'host'), { recursive: true }); fs.copyFileSync(path.join(here, 'shim.js'), path.join(out, 'host', 'shim.js')); files['host/shim.js'] = path.join(out, 'host', 'shim.js');
fs.writeFileSync(path.join(out, 'files.json'), JSON.stringify(files, null, 1));
console.log('page', path.join(out, 'index.html'), (page.length / 1024).toFixed(0) + ' KB · ' + Object.keys(files).length + ' files · stamp ' + stamp);
