"""FIT THE BASE BODY TO THE GAME'S SKELETON (10-16). Blender Studio's realistic male base (CC0, sources/juno/base/) is put into the game's own
rest pose with the game's own bone lengths — so the game's animation, written against that skeleton, moves it as it moves Juno:

  1. the base, scaled so the top of its skull is the game's head bone's tail (1.76 m), at the origin — the eyes with it: they are the body's
     children in the bundle, so their places are read in the world (the scene evaluated first) before the parent is cleared;
  2. its joints read off its own surface (the rings between its sculpt face sets: landmarks.py's reading);
  3. a temporary armature in ITS pose — the game's bone names and parents, the base's joints — the body bound to it by Blender's automatic
     weights;
  4. each of those bones posed onto the game's bone: its head on the game's head, its line along the game's line, stretched to the game's
     length (no scale inherited) — the body carried with them, and the result kept as the new surface;
  4b. held SYMMETRIC: the base is sculpted symmetric, and automatic weights are a numerical solution a little different on each side (the fit
     through them left the face 0.7 mm and the thighs 4.6 mm off their own mirror). Each vertex whose partner across the midline is its
     own partner's partner (within 0.5 mm, read on the base before the fit: 9,934 of 10,582) is set with it to the mean of the one and the
     other's mirror; the rest (the base's own small asymmetries: the ears) are set, each side in turn, onto the other side's mirrored
     surface, until the surfaces meet;
  5. saved (work/juno_fitted.blend) for the clothes, the hair and the face's detail to be made on; and, to check the fit, the fitted body
     bound to the game's armature by automatic weights (four a vertex, as glTF keeps) and exported (work/juno_fitted.glb).

The game's rig space is x across, y up, z toward the nose; Blender's is z up with the front at −y: a game point (x, y, z) is Blender (x, −z, y).
Usage: sh sources/juno/blender.sh --python fit_base.py -- --bundle <the .blend> --skeleton skeleton.json --work work/"""
import bpy, sys, json, math
import numpy as np
from mathutils import Vector, Matrix
from collections import defaultdict

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
args = dict(zip(argv[0::2], argv[1::2]))
BODY = args.get('--body', 'GEO-body_male_realistic')
WORK = args['--work'].rstrip('/') + '/'
sk = json.load(open(args['--skeleton']))
GB = {b['name']: b for b in sk['bones']}
B = lambda v: Vector((v[0], -v[2], v[1]))           # game → Blender

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
with bpy.data.libraries.load(args['--bundle'], link=False) as (src, dst):
    dst.objects = [BODY, BODY + '.eye.L', BODY + '.eye.R']
body, eyeL, eyeR = dst.objects
for o in (body, eyeL, eyeR): scene.collection.objects.link(o)
for m in list(body.modifiers): body.modifiers.remove(m)   # the multires: the base level only (its sculpt is the next step's to bake)

# 1. scale and place: the skull's top on the game's head tail, at the origin (the world matrices evaluated first: an appended object's
#    reads the identity until the scene updates — the eyes, the body's children, then fell to the origin)
bpy.context.view_layer.update()
mw = body.matrix_world.copy()
V0 = np.array([(mw @ v.co)[:] for v in body.data.vertices])
off = Vector((float(-mw.translation.x), 0.0, 0.0))
top = V0[:, 2].max() - V0[:, 2].min()
k = GB['head']['tail'][1] / top
S = Matrix.Scale(k, 4) @ Matrix.Translation(off)
world0 = {o.name: o.matrix_world.copy() for o in (body, eyeL, eyeR)}   # the eyes are the body's children in the bundle: their place is in the world
for o in (body, eyeL, eyeR):
    o.parent = None; o.matrix_world = S @ world0[o.name]   # (10-16: the parent cleared first, the eyes fell to the origin — at his feet)
bpy.context.view_layer.update()
for o in (body, eyeL, eyeR):
    o.data = o.data.copy()
    o.data.transform(o.matrix_world); o.matrix_world = Matrix.Identity(4)
me = body.data
V = np.array([v.co[:] for v in me.vertices])
# its mirror, read now while it is the base's own (sculpted symmetric): each vertex's partner across the midline, to hold the fit symmetric —
# Blender's automatic weights are a numerical solution, a little different on each side, and the fit through them left the face 0.7 mm and
# the thighs 4.6 mm off their own mirror
from mathutils.kdtree import KDTree
kdm = KDTree(len(V))
for i, q in enumerate(V): kdm.insert(Vector(q.tolist()), i)
kdm.balance()
MIRROR = []; worstPair = 0.0
for i, q in enumerate(V):
    co, j, d = kdm.find(Vector((-q[0], q[1], q[2]))); MIRROR.append(j); worstPair = max(worstPair, d)
bad = [i for i, j in enumerate(MIRROR) if MIRROR[j] != i or (Vector(V[j].tolist()) - Vector((-V[i][0], V[i][1], V[i][2]))).length > 0.0005]
for i in bad: MIRROR[i] = None   # no partner that is its own partner within half a millimetre: left as the fit put it
far = sorted(((Vector(V[MIRROR[i]].tolist()) - Vector((-V[i][0], V[i][1], V[i][2]))).length, i) for i in range(len(V)) if MIRROR[i] is not None)[-1]
print('MIRROR OF THE BASE: %d of %d vertices paired (each its partner\'s partner, within 0.5 mm: the farthest %.4f mm); %d left unpaired, the worst of them at z %.3f' % (len(V) - len(bad), len(V), far[0] * 1000, len(bad), max((V[i][2] for i in bad), default=0)))

# 2. its joints, off its own face sets (the realistic male's numbering — inspect_base4.py)
fs = me.attributes['.sculpt_face_set'].data
setv = defaultdict(set); ef = defaultdict(list); ring = defaultdict(set)
for p in me.polygons:
    setv[fs[p.index].value].update(p.vertices)
    for e in p.edge_keys: ef[e].append(fs[p.index].value)
for e, s2 in ef.items():
    if len(s2) == 2 and s2[0] != s2[1]: ring[tuple(sorted(s2))].update(e)
centre = lambda a, b: V[list(ring[tuple(sorted((a, b)))])].mean(0)
def axis(sid):
    P = V[list(setv[sid])]; c = P.mean(0); u, s, vt = np.linalg.svd(P - c); return c, vt[0]
def onAxis(sid, point):
    c, d = axis(sid); return c + d * np.dot(point - c, d)
SETS = {'L': dict(up=21, fore=12, palm=9, thigh=24, shin=15, foot=14), 'R': dict(up=20, fore=11, palm=10, thigh=23, shin=16, foot=13)}
J = {}
for sd, s in SETS.items():
    J['elbow' + sd] = centre(s['up'], s['fore']); J['wrist' + sd] = centre(s['fore'], s['palm'])
    J['knee' + sd] = centre(s['thigh'], s['shin']); J['ankle' + sd] = centre(s['shin'], s['foot'])
    # the shoulder and the hip: up each limb's own axis from the elbow and the knee by the game's own upper arm and thigh — the rings there
    # are slanted, and read off them the thigh came out 11.6 % short of the game's (its hip low) and was stretched to fit
    for joint, seg, dist, gname in (('shoulder', 'up', 'elbow', 'arm'), ('hip', 'thigh', 'knee', 'thigh')):
        c, d = axis(s[seg]); toward = c - J[dist + sd]; d = d if np.dot(d, toward) > 0 else -d
        J[joint + sd] = J[dist + sd] + d * float(np.linalg.norm(np.array(GB[gname + sd]['tail']) - np.array(GB[gname + sd]['head'])))
    P = V[list(setv[s['foot']])]; J['ball' + sd] = np.array([P[:, 0].mean(), P[:, 1].min(), P[:, 2].min() + 0.02])
    P = V[list(setv[s['palm']])]; J['palm' + sd] = P.mean(0)
J['headTop'] = V[list(setv[17])][V[list(setv[17])][:, 2].argmax()]
Jv = {n: Vector(p.tolist()) for n, p in J.items()}

# the trunk's joints: the game's heights between its thigh heads and its shoulders (and on to the skull's top) taken in the same proportion
# between the base's; each on the body's own middle (front to back) at its height
gy = lambda n, e='head': GB[n][e][1]
bHip = (Jv['hipL'].z + Jv['hipR'].z) / 2; bSh = (Jv['shoulderL'].z + Jv['shoulderR'].z) / 2; bTop = Jv['headTop'].z
gHip, gSh, gTop = gy('thighL'), gy('armL'), gy('head', 'tail')
def baseZ(gz):
    if gz <= gSh: return bHip + (gz - gHip) / (gSh - gHip) * (bSh - bHip)
    return bSh + (gz - gSh) / (gTop - gSh) * (bTop - bSh)
# the trunk is not turned: its bones keep the game's own lines (the front-to-back middle of a body with a chest, a belly and a seat is no
# line — read off it the chest turned 6.9° and the neck 21°), set on the base's spine at the heights above, so the trunk is only moved and
# stretched up and down
band = V[(np.abs(V[:, 0]) < 0.06) & (V[:, 2] > bHip) & (V[:, 2] < bSh)]
spineY = float((band[:, 1].min() + band[:, 1].max()) / 2)
base = {}   # each bone's head and tail in the base's pose (Blender space)
for n in ['hips', 'spine', 'chest', 'neck', 'head']:
    h = Vector((0.0, spineY, baseZ(gy(n)))); d = (B(GB[n]['tail']) - B(GB[n]['head'])); zt = baseZ(gy(n, 'tail')) if n != 'head' else float(bTop)
    base[n] = [h, h + d * ((zt - h.z) / d.z)]
for sd in 'LR':
    sgn = 1 if sd == 'L' else -1
    shoulder, elbow, wrist = Jv['shoulder' + sd], Jv['elbow' + sd], Jv['wrist' + sd]
    clavHead = Vector((sgn * abs(GB['clav' + sd]['head'][0]), spineY, shoulder.z - (GB['arm' + sd]['head'][1] - GB['clav' + sd]['head'][1])))
    base['clav' + sd] = [clavHead, shoulder.copy()]
    base['arm' + sd] = [shoulder.copy(), elbow.copy()]
    base['fore' + sd] = [elbow.copy(), wrist.copy()]
    hand = Jv['palm' + sd] - wrist; base['hand' + sd] = [wrist.copy(), wrist + hand.normalized() * 0.17]
    base['thigh' + sd] = [Jv['hip' + sd].copy(), Jv['knee' + sd].copy()]
    base['shin' + sd] = [Jv['knee' + sd].copy(), Jv['ankle' + sd].copy()]
    base['foot' + sd] = [Jv['ankle' + sd].copy(), Jv['ball' + sd].copy()]

# 3. the temporary armature in the base's pose, the body on it by automatic weights
def armature(name, heads):
    data = bpy.data.armatures.new(name); arm = bpy.data.objects.new(name, data); scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm; arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); eb = {}
    for b in sk['bones']:
        e = data.edit_bones.new(b['name']); e.head, e.tail = heads[b['name']]; e.inherit_scale = 'NONE'; eb[b['name']] = e
    for b in sk['bones']:
        if b['parent']: eb[b['name']].parent = eb[b['parent']]; eb[b['name']].use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT'); return arm
def bind(obj, arm):
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
tmp = armature('BaseRig', base)
bind(body, tmp)
for eye in (eyeL, eyeR):   # the eyes ride the head bone whole
    eye.parent = tmp; eye.parent_type = 'BONE'; eye.parent_bone = 'head'
    eye.matrix_parent_inverse = (tmp.matrix_world @ Matrix.Translation(tmp.data.bones['head'].tail_local) @ tmp.data.bones['head'].matrix_local.to_3x3().to_4x4()).inverted()

# 4. each bone onto the game's: head to head, line along line, stretched to length
bpy.context.view_layer.objects.active = tmp; bpy.ops.object.mode_set(mode='POSE')
report = []
for b in sk['bones']:
    n = b['name']; bone = tmp.data.bones[n]; pb = tmp.pose.bones[n]
    h0, t0 = bone.head_local, bone.tail_local; h1, t1 = B(b['head']), B(b['tail'])
    d0, d1 = (t0 - h0), (t1 - h1)
    R = d0.normalized().rotation_difference(d1.normalized()).to_matrix().to_4x4()
    rest = bone.matrix_local.to_3x3()
    sc = 1.0 if n[:4] in ('hand', 'foot') else d1.length / d0.length   # a hand and a foot keep their own size: their bones end in no joint
    M = Matrix.Translation(h1) @ R @ rest.to_4x4() @ Matrix.Diagonal((1.0, sc, 1.0, 1.0))
    pb.matrix = M
    bpy.context.view_layer.update()
    report.append('%s %+.1f%% %.1f°' % (n, 100 * (sc - 1), math.degrees(d0.angle(d1))))
bpy.ops.object.mode_set(mode='OBJECT')
print('FIT: k %.4f · ' % k + ' · '.join(report))
# keep the posed surface: the armature's work applied, the eyes set where the head bone took them
bpy.context.view_layer.objects.active = body
for m in body.modifiers:
    if m.type == 'ARMATURE': bpy.ops.object.modifier_apply(modifier=m.name)
# held symmetric: each vertex and its partner set to the mean of the one and the other's mirror (a midline vertex onto x = 0)
P = [v.co.copy() for v in body.data.vertices]
for i, j in enumerate(MIRROR):
    if j is None: continue
    q = P[j]; m = (P[i] + Vector((-q.x, q.y, q.z))) / 2; body.data.vertices[i].co = m
body.data.update()
# the rest (the base's own small asymmetries, where no vertex is the other's mirror: its ears read 0.73 mm): the right side's onto the left
# side's surface, mirrored — the surfaces then mirror each other where the vertices cannot
from mathutils.bvhtree import BVHTree
moved = 0; faces = [list(reversed(p.vertices)) for p in body.data.polygons]
for rnd in range(6):   # each side in turn onto the other's mirror: two surfaces of different vertices meet (a chord error shrinks each pass)
    side = -1 if rnd % 2 == 0 else 1
    bvhM = BVHTree.FromPolygons([Vector((-v.co.x, v.co.y, v.co.z)) for v in body.data.vertices], faces)
    for i, j in enumerate(MIRROR):
        if j is not None: continue
        v = body.data.vertices[i]
        if v.co.x * side > 1e-4:
            hit = bvhM.find_nearest(v.co)
            if hit[0] is not None: v.co = v.co.lerp(hit[0], 1.0 if rnd == 0 else 0.5); moved += 1
body.data.update()
print('MIRRORED BY SURFACE: %d unpaired vertices on the right set onto the left side\'s mirrored surface' % moved)
for eye in (eyeL, eyeR):
    mwE = eye.matrix_world.copy(); eye.parent = None; eye.matrix_world = mwE
    eye.data.transform(eye.matrix_world); eye.matrix_world = Matrix.Identity(4)
body.vertex_groups.clear()
bpy.data.objects.remove(tmp)
body.name = 'JunoBody'; eyeL.name = 'JunoEye.L'; eyeR.name = 'JunoEye.R'
bpy.ops.wm.save_as_mainfile(filepath=WORK + 'juno_fitted.blend')

# 5. to check the fit: the game's own armature, the body on it by automatic weights (four a vertex), out as glTF
game = armature('JunoRig', {n: [B(GB[n]['head']), B(GB[n]['tail'])] for n in GB})
bind(body, game)
bpy.context.view_layer.objects.active = body; body.select_set(True)
bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
bpy.ops.object.mode_set(mode='OBJECT')
for eye in (eyeL, eyeR):
    eye.vertex_groups.clear(); g = eye.vertex_groups.new(name='head'); g.add(list(range(len(eye.data.vertices))), 1.0, 'REPLACE')
    eye.parent = game; mod = eye.modifiers.new('Armature', 'ARMATURE'); mod.object = game
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.export_scene.gltf(filepath=WORK + 'juno_fitted.glb', export_format='GLB', export_yup=True, export_skins=True, export_animations=False)
tris = sum(len(p.vertices) - 2 for p in body.data.polygons)
print('FITTED: %d vertices, %d triangles (+ the eyes %d) -> %s' % (len(body.data.vertices), tris, sum(len(p.vertices) - 2 for e in (eyeL, eyeR) for p in e.data.polygons), WORK + 'juno_fitted.glb'))
