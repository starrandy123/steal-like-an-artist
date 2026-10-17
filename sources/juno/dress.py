"""DRESS JUNO (10-16): his clothes, his beanie and his hair, made in Blender by this script from his own fitted body — ours, every piece:
nothing of them is downloaded. The body under them is the CC0 base fitted to the game's skeleton (fit_base.py → work/juno_fitted.blend).

Each piece is grown from the body's own region (its sculpt face sets, cut by height where a garment ends), every piece ONE connected piece
of its own (the largest, `mainPiece`: a stray face of the region on the head is not a garment):
  · grow(): a CLOSED blob — the region's surface pushed out along its normals by the garment's ease, smoothed so cloth hangs instead of
    hugging muscle, its open ends capped (the cargos, the shoes, the beanie and its cuff, the hair); χ = 2 each;
  · sheet(): a THICK SHEET — the region pushed out and given a thickness (Solidify), its openings left open as cloth is (the tee: the neck,
    the hem and both sleeves, χ = −4; the jacket: open down the front and at both cuffs, χ = −2; the collar);
  · the body's skin is CUT AWAY where a garment hides it (`hidden`: inside the cargos above their hem, the sleeves above the cuffs, the
    torso under the tee and the jacket, the feet in the shoes, the skull under the beanie, each with 4 cm to spare) — what is left (JunoSkin:
    the head and neck, the hands, the shins between the cargos and the shoes) is open where it was cut, and never seen open.
No piece is unioned with another (v1's union left 1,176 open edges and 18 pinched where the boolean met thin cloth). Each face keeps its
part (skin, jacket, tee, pants, shoe, sole, beanie, hair, lip, cuff): the game's paint and cloth tables read it. Each piece's shape is
printed (pieces, open edges, edges on three or more triangles) and walled on the export (juno_walls.mjs).

  sh sources/juno/blender.sh work/juno_fitted.blend --python dress.py -- --skeleton skeleton.json --work work/

Juno (DESIGN §7.4): 19, regular, tall and lean; a cropped rust work jacket over a cream tee, loose olive cargos, a mustard knit beanie,
curly dark hair, canvas shoes on gum soles."""
import bpy, bmesh, sys, json, math, random
from mathutils import Vector, Matrix, noise
from mathutils.bvhtree import BVHTree
from collections import defaultdict

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
args = dict(zip(argv[0::2], argv[1::2]))
WORK = args['--work'].rstrip('/') + '/'
sk = json.load(open(args['--skeleton'])); GB = {b['name']: b for b in sk['bones']}
B = lambda v: Vector((v[0], -v[2], v[1]))
scene = bpy.context.scene
body = bpy.data.objects['JunoBody']
PARTS = ['skin', 'jacket', 'cuff', 'tee', 'pants', 'pocket', 'shoe', 'sole', 'beanie', 'hair', 'lip']
def material(part):
    m = bpy.data.materials.get('part:' + part) or bpy.data.materials.new('part:' + part); return m

# the body's own regions (fit_base.py keeps the base's face sets)
me = body.data
fsA = me.attributes['.sculpt_face_set'].data
FS = [fsA[p.index].value for p in me.polygons]
REG = dict(head=17, torso=1, abdomen=19, pelvis=18, upL=21, upR=20, foreL=12, foreR=11, palmL=9, palmR=10, thighL=24, thighR=23, shinL=15, shinR=16,
           footL=14, footR=13, eyeL=2, eyeR=3, earL=4, earR=5, nose=7, mouth=8, jaw=22)
ankleZ = B(GB['footL']['head']).z; kneeZ = B(GB['shinL']['head']).z
toeSets = {s for s in set(FS) if s >= 25 and s <= 63}

def mainPiece(bm):
    """the region's largest connected piece (by shared edges): a face set can hold a stray face elsewhere — the torso's set has four on the head"""
    bm.faces.ensure_lookup_table(); seen = set(); best = []
    for f in bm.faces:
        if f.index in seen: continue
        st = [f]; comp = []
        while st:
            g = st.pop()
            if g.index in seen: continue
            seen.add(g.index); comp.append(g)
            for e in g.edges: st.extend(h for h in e.link_faces if h.index not in seen)
        if len(comp) > len(best): best = comp
    keep = set(f.index for f in best); bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')

def tagSource(bm):
    """every vertex keeps the index of the body vertex it is (or was pushed out from): `src`, read by the export to give it that vertex's
    weights exactly (10-16; the nearest surface had been asked, and under a hanging arm the nearest was the arm)"""
    src = bm.verts.layers.int.new('src')
    for v in bm.verts: v[src] = v.index

def grow(name, keep, ease, part, smooth=6, lumps=None, extra=None):
    """a garment's shell: the faces `keep` picks, pushed out by `ease(co)` along their normals, smoothed, the ends capped"""
    bm = bmesh.new(); bm.from_mesh(me); bm.normal_update(); tagSource(bm)
    drop = [f for f in bm.faces if not keep(f, FS[f.index])]
    bmesh.ops.delete(bm, geom=drop, context='FACES')
    loose = [v for v in bm.verts if not v.link_faces]; bmesh.ops.delete(bm, geom=loose, context='VERTS')
    mainPiece(bm)
    for v in bm.verts: v.co = v.co + v.normal * ease(v.co)
    inner = [v for v in bm.verts if not v.is_boundary]
    for _ in range(smooth): bmesh.ops.smooth_vert(bm, verts=inner, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    if lumps:
        bm.normal_update()
        for v in bm.verts:
            if not v.is_boundary: v.co = v.co + v.normal * lumps(v.co)
    if extra: extra(bm)
    edges = [e for e in bm.edges if e.is_boundary]
    if edges:
        res = bmesh.ops.holes_fill(bm, edges=edges, sides=0)
        bmesh.ops.triangulate(bm, faces=res['faces'])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    m = bpy.data.meshes.new(name); bm.to_mesh(m); bm.free()
    o = bpy.data.objects.new(name, m); scene.collection.objects.link(o)
    o.data.materials.append(material(part)); return o

def sheet(name, keep, ease, part, thick=0.005, smooth=6):
    """a garment with openings (a jacket, a tee): the region pushed out by its ease and smoothed, then given a thickness inward with its rims
    filled (Solidify) — a closed piece whose handles are its own openings, named in the topology wall"""
    bm = bmesh.new(); bm.from_mesh(me); bm.normal_update(); tagSource(bm)
    drop = [f for f in bm.faces if not keep(f, FS[f.index])]
    bmesh.ops.delete(bm, geom=drop, context='FACES')
    loose = [v for v in bm.verts if not v.link_faces]; bmesh.ops.delete(bm, geom=loose, context='VERTS')
    mainPiece(bm)
    for v in bm.verts: v.co = v.co + v.normal * ease(v.co)
    inner = [v for v in bm.verts if not v.is_boundary]
    for _ in range(smooth): bmesh.ops.smooth_vert(bm, verts=inner, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    m = bpy.data.meshes.new(name); bm.to_mesh(m); bm.free()
    o = bpy.data.objects.new(name, m); scene.collection.objects.link(o); o.data.materials.append(material(part))
    md = o.modifiers.new('solid', 'SOLIDIFY'); md.thickness = thick; md.offset = -1.0; md.use_rim = True; md.use_even_offset = True
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier=md.name)
    return o

def box(name, lo, hi, part):
    m = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((lo[k] + (v.co[k] + 0.5) * (hi[k] - lo[k]) for k in range(3)))
    bm.to_mesh(m); bm.free(); o = bpy.data.objects.new(name, m); scene.collection.objects.link(o); o.data.materials.append(material(part)); return o

def union(a, b, op='UNION'):
    md = a.modifiers.new('bool', 'BOOLEAN'); md.operation = op; md.object = b; md.solver = 'EXACT'
    bpy.context.view_layer.objects.active = a; bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.data.objects.remove(b)

zc = lambda f: sum(v.co.z for v in f.verts) / len(f.verts)
xc = lambda f: sum(v.co.x for v in f.verts) / len(f.verts)
yc = lambda f: sum(v.co.y for v in f.verts) / len(f.verts)

# ---- the cargos: the pelvis, the thighs and the shins to 6 cm above the ankle; loose (2.8 cm at the knee and below, 1.4 at the waist) ----
waistZ = 1.035; hemZ = ankleZ + 0.06
def pantsKeep(f, s):
    z = zc(f)
    if s in (REG['pelvis'], REG['thighL'], REG['thighR']): return True
    if s in (REG['shinL'], REG['shinR']): return z > hemZ
    if s == REG['abdomen']: return z < waistZ
    return False
pantsEase = lambda co: 0.014 if co.z > 0.9 else 0.014 + 0.014 * min(1.0, (0.9 - co.z) / 0.35)
pants = grow('pants', pantsKeep, pantsEase, 'pants')

# ---- the tee: the torso and the abdomen from the waist up, close (0.6 cm) — it shows where the jacket is open and below its cropped hem ----
teeKeep = lambda f, s: s == REG['torso'] or (s == REG['abdomen'] and zc(f) > waistZ - 0.03) or (s in (REG['upL'], REG['upR']) and zc(f) > 1.36)
tee = sheet('tee', teeKeep, lambda co: 0.006, 'tee', thick=0.003, smooth=3)

# ---- the jacket: the torso to its cropped hem, the arms to the wrist; 1.8 cm of ease, 2.2 on the arms; open down the front ----
jacketHem = 1.075
def jacketKeep(f, s):
    z = zc(f)
    if s == REG['torso']: return True
    if s == REG['abdomen']: return z > jacketHem
    if s in (REG['upL'], REG['upR'], REG['foreL'], REG['foreR']): return True
    return False
neckZ = 1.47
def frontOpen(f):   # the jacket open down the front: 5 cm wide at the collar, 15 at the hem, on the front (−y) half
    z = zc(f); half = 0.025 + (0.075 - 0.025) * max(0.0, min(1.0, (neckZ + 0.08 - z) / (neckZ + 0.08 - (jacketHem - 0.05))))
    return yc(f) < -0.02 and abs(xc(f)) < half
jacket = sheet('jacket', lambda f, s: jacketKeep(f, s) and not frontOpen(f), lambda co: 0.022 if abs(co.x) > 0.17 else 0.018, 'jacket', thick=0.006)
# the collar: a band round the neck at the jacket's top, standing 4 cm, open at the front as the jacket is
collar = sheet('collar', lambda f, s: s == REG['head'] and zc(f) < neckZ + 0.045 and not frontOpen(f), lambda co: 0.024, 'cuff', thick=0.006, smooth=2)

# ---- the shoes: the foot and the toes, 1.1 cm of ease, and the ankle's collar; a gum sole under each ----
def shoeKeep(sd):
    return lambda f, s: s == REG['foot' + sd] or (s in toeSets and (xc(f) > 0) == (sd == 'L')) or (s == REG['shin' + sd] and zc(f) < ankleZ + 0.035)
shoes = [grow('shoe' + sd, shoeKeep(sd), lambda co: 0.011, 'shoe', smooth=4) for sd in 'LR']
soles = []
for sd, shoe in zip('LR', shoes):
    P = [v.co for v in shoe.data.vertices if v.co.z < ankleZ - 0.02]
    lo = (min(p.x for p in P) - 0.004, min(p.y for p in P) - 0.006, -0.002); hi = (max(p.x for p in P) + 0.004, max(p.y for p in P) + 0.004, min(p.z for p in P) + 0.012)
    soles.append(box('sole' + sd, lo, hi, 'sole'))

# ---- the beanie: the skull above a line from the brow to the occiput, 1.4 cm out over the hair; a folded cuff at its edge ----
browZ, napeZ = 1.712, 1.645
def beanieCut(co):   # the beanie's edge: high at the front, low at the back
    t = min(1.0, max(0.0, (co.y + 0.13) / 0.20)); return browZ + (napeZ - browZ) * t
beanie = grow('beanie', lambda f, s: s == REG['head'] and zc(f) > beanieCut(Vector((xc(f), yc(f), zc(f)))), lambda co: 0.016 + 0.004 * max(0.0, (co.z - 1.74) / 0.03), 'beanie', smooth=8)
cuff = grow('beanieCuff', lambda f, s: s == REG['head'] and abs(zc(f) - beanieCut(Vector((xc(f), yc(f), zc(f)))) - 0.018) < 0.02, lambda co: 0.022, 'beanie', smooth=2)

# ---- the hair: curls below the beanie at the sides and the back (and a few at the brow), lumpy: 0.9 cm out, 0.6 cm of curl ----
def hairKeep(f, s):
    if s != REG['head']: return False
    co = Vector((xc(f), yc(f), zc(f))); cut = beanieCut(co)
    if co.z > cut + 0.01: return False
    if co.y < -0.10: return co.z > cut - 0.025   # at the brow: a fringe just under the cuff
    if abs(co.x) > 0.06 and co.y < 0.0: return co.z > 1.640   # the temples, above the ears
    return co.z > 1.585 and co.y > -0.02   # the back of the head to the nape
curl = lambda co: 0.006 * (0.5 + 0.5 * noise.noise(co * 70.0))
hair = grow('hair', hairKeep, lambda co: 0.009, 'hair', smooth=3, lumps=curl)

# ---- the body: its face parts painted (the lips) ----
for i, s in enumerate(FS):
    pass
bodyM = me
bodyM.materials.clear(); bodyM.materials.append(material('skin')); bodyM.materials.append(material('lip'))
for p in bodyM.polygons:
    if FS[p.index] == REG['mouth'] and abs(p.center.x) < 0.024 and abs(p.center.z - 1.569) < 0.012: p.material_index = 1

# ---- each piece's own shape, before the union (the topology gate's reading: pieces, open edges, edges on three or more) ----
def shape(o):
    bm = bmesh.new(); bm.from_mesh(o.data)
    openE = sum(1 for e in bm.edges if e.is_boundary); pinched = sum(1 for e in bm.edges if len(e.link_faces) > 2)
    seen = set(); pieces = 0
    for v in bm.verts:
        if v in seen: continue
        pieces += 1; st = [v]
        while st:
            u = st.pop()
            if u in seen: continue
            seen.add(u); st.extend(e.other_vert(u) for e in u.link_edges)
    chi = len(bm.verts) - len(bm.edges) + len(bm.faces); bm.free(); return pieces, chi, openE, pinched
for o in [pants, tee, jacket, collar, *shoes, *soles, beanie, cuff, hair]:
    print('PIECE %-12s pieces %d · V-E+F %d · open %d · on 3+ %d' % ((o.name,) + shape(o)))
# ---- the body under the clothes, cut away where it cannot be seen: inside the cargos above their hem (less 4 cm), inside the jacket's
# sleeves above its cuffs (less 4 cm), the torso under the tee and the jacket, the feet inside the shoes, the skull under the beanie ----
def hidden(f, s):
    z = zc(f)
    if s in (REG['pelvis'], REG['thighL'], REG['thighR']): return True
    if s in (REG['shinL'], REG['shinR']): return z > hemZ + 0.04
    if s == REG['abdomen']: return True
    if s == REG['torso']: return z < 1.50 and not frontOpen(f) or (z < 1.44)
    if s in (REG['upL'], REG['upR']): return True
    if s in (REG['foreL'], REG['foreR']): return z > 0.93
    if s in (REG['footL'], REG['footR']) or s in toeSets: return True
    return False
bmB = bmesh.new(); bmB.from_mesh(me); tagSource(bmB)
bmesh.ops.delete(bmB, geom=[f for f in bmB.faces if hidden(f, FS[f.index])], context='FACES')
bmesh.ops.delete(bmB, geom=[v for v in bmB.verts if not v.link_faces], context='VERTS')
cutM = bpy.data.meshes.new('JunoSkin'); bmB.to_mesh(cutM); bmB.free()
for mat in me.materials: cutM.materials.append(mat)
skin = bpy.data.objects.new('JunoSkin', cutM); scene.collection.objects.link(skin)
pieces = [skin, pants, tee, jacket, collar, *shoes, *soles, beanie, cuff, hair]
total = 0
for o in pieces:
    pc, chi, op, pin = shape(o); t3 = sum(len(p.vertices) - 2 for p in o.data.polygons); total += t3
    print('DRESSED %-12s %6d triangles · pieces %d · V-E+F %d · open %d · on 3+ %d' % (o.name, t3, pc, chi, op, pin))
print('DRESSED: %d triangles in %d pieces' % (total, len(pieces)))
for o in pieces:
    if o.name.startswith('sole'): continue
    a = o.data.attributes.get('src'); vals = [d.value for d in a.data] if a else []
    far_ = max(((o.data.vertices[i].co - me.vertices[x].co).length for i, x in enumerate(vals)), default=float('nan'))
    print('SOURCE %-12s %s · the farthest a vertex lies from its source %.1f mm' % (o.name, ('%d of %d vertices carry one' % (sum(1 for x in vals if 0 <= x < len(me.vertices)), len(o.data.vertices))) if a else 'NO src', far_ * 1000))
for o in list(scene.collection.objects):
    if o.name not in [q.name for q in pieces] + ['JunoEye.L', 'JunoEye.R', 'JunoBody']: bpy.data.objects.remove(o)
bpy.ops.wm.save_as_mainfile(filepath=WORK + 'juno_dressed.blend')
