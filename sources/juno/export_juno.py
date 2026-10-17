"""JUNO OUT TO THE GAME (10-16): the dressed pieces (dress.py → work/juno_dressed.blend) bound to the game's own armature and written as glTF.
  · the armature: the game's skeleton (skeleton.json), its rest pose the bind pose (game (x, y, z) → Blender (x, −z, y));
  · the weights: the fitted body bound by Blender's automatic weights, and every piece given the weights of the body vertex each of its
    vertices was grown from (dress.py's `src`), before the budget's decimation; the eyes the head's, the soles their foot's; four a vertex at
    most (glTF's own), each vertex's summing to 1;
  · the shade the game's material reads: `_OCC`, how open each vertex is to the sky (rays over its hemisphere against every piece, 12 cm);
  · each piece's material is its part (part:skin, part:jacket, …): the game's paint and cloth tables read it.
  · the budget (DESIGN §10: ≤ 30k triangles for the player's own skater, ≤ 12k for a friend's): --lod 0 or 1, every piece decimated by one
    share (the eyes, round, to a few hundred) but the small capped pieces, kept whole (the soles, the beanie and its cuff, the hair, the
    collar: decimation pinched their capped fans), each piece's shape read after (closed, nothing pinched);
  · every quad split here along a diagonal no other face already holds (left to the glTF writer, two quads sharing their opposite corners
    were split along one line: an edge on four triangles — the beanie read 8, the hair 2, on the walls as the game loads the file)
Usage: sh sources/juno/blender.sh work/juno_dressed.blend --python export_juno.py -- --skeleton skeleton.json --out work/juno.glb [--lod 0|1]
       [--with-body 1: a test file for deform_check.mjs, the closed body kept beside the pieces — never shipped]"""
import bpy, bmesh, sys, json, math
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
args = dict(zip(argv[0::2], argv[1::2]))
sk = json.load(open(args['--skeleton'])); B = lambda v: Vector((v[0], -v[2], v[1]))
scene = bpy.context.scene
PIECES = ['JunoSkin', 'pants', 'tee', 'jacket', 'collar', 'shoeL', 'shoeR', 'soleL', 'soleR', 'beanie', 'beanieCuff', 'hair', 'JunoEye.L', 'JunoEye.R']
data = bpy.data.armatures.new('JunoRig'); arm = bpy.data.objects.new('JunoRig', data); scene.collection.objects.link(arm)
LOD = int(args.get('--lod', '0')); BUDGET = (29000, 11800)[LOD]
def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
def decimate(o, ratio):
    if ratio >= 0.999: return
    md = o.modifiers.new('budget', 'DECIMATE'); md.decimate_type = 'COLLAPSE'; md.ratio = ratio; md.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier=md.name)
# the small capped pieces are kept whole: collapsing a cap's fan pinched its edges (the beanie, its cuff and the hair read 8 open edges and 4
# on three triangles at a 0.95 share)
KEEP = ('soleL', 'soleR', 'beanie', 'beanieCuff', 'hair', 'collar')
eyeT = (400, 200)[LOD]; fixed = sum(min(tris(bpy.data.objects[n]), eyeT) for n in PIECES if n.startswith('JunoEye')) + sum(tris(bpy.data.objects[n]) for n in KEEP)
rest = [n for n in PIECES if not n.startswith('JunoEye') and n not in KEEP]; share = min(1.0, (BUDGET - fixed) / sum(tris(bpy.data.objects[n]) for n in rest))
# every quad split here along a diagonal no other face already holds: left to the glTF writer, two quads that share their opposite corners
# (where a hole was filled, or smoothing folded a strip) were both split along that one line — an edge on four triangles (the beanie read 8,
# the hair 2)
def triangulateSafely(o):
    bm = bmesh.new(); bm.from_mesh(o.data); used = {frozenset((e.verts[0].index, e.verts[1].index)) for e in bm.edges}
    for f in [f for f in bm.faces if len(f.verts) == 4]:
        v = list(f.verts); d1, d2 = frozenset((v[0].index, v[2].index)), frozenset((v[1].index, v[3].index))
        a, b = (v[0], v[2]) if d1 not in used else (v[1], v[3]) if d2 not in used else (v[0], v[2])
        bmesh.utils.face_split(f, a, b); used.add(frozenset((a.index, b.index)))
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
    bm.to_mesh(o.data); bm.free()
# THE ARMATURE AND THE BODY'S OWN WEIGHTS FIRST, on the whole body
bpy.context.view_layer.objects.active = arm; arm.select_set(True); bpy.ops.object.mode_set(mode='EDIT'); eb = {}
for b in sk['bones']: e = data.edit_bones.new(b['name']); e.head = B(b['head']); e.tail = B(b['tail']); eb[b['name']] = e
for b in sk['bones']:
    if b['parent']: eb[b['name']].parent = eb[b['parent']]; eb[b['name']].use_connect = False
bpy.ops.object.mode_set(mode='OBJECT')
body = bpy.data.objects['JunoBody']
bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
# THE BODY'S WEIGHTS ARE TAKEN IN A SPREAD POSE (10-16). Blender's automatic weights spread each bone's heat to the surface it can SEE, and in
# the game's rest pose the arms hang beside the torso and the thighs nearly touch: the torso's sides took 0.31 of an arm, the inner thighs
# 0.22 of the other thigh, each clavicle 0.15 across the sternum — and a garment grown from them was pulled through the body (the tee 228 mm
# into it in the 5-0). The standard bind: the body posed with its limbs apart — each arm raised SPREAD_ARM, each leg out SPREAD_LEG, by the
# weights just taken — the automatic weights taken THERE against an armature whose rest is that pose, and given back to the same vertices
# (the weights do not depend on the pose; the game skins from its own rest).
SPREAD_ARM, SPREAD_LEG = 80, 20   # 10-16: at 50 and 15 the torso's sides still took 0.22 of an arm (from 0.31 at rest)
def spreadBind():
    pose = arm.pose; turns = {}
    for n, deg in (('armL', SPREAD_ARM), ('armR', SPREAD_ARM), ('thighL', SPREAD_LEG), ('thighR', SPREAD_LEG)):
        bo = arm.data.bones[n]; d = (bo.tail_local - bo.head_local).normalized(); out = Vector((1 if bo.head_local.x > 0 else -1, 0, 0))
        axis = d.cross(out).normalized()   # turning the bone about this by a positive angle moves it toward its own side
        pb = pose.bones[n]; pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = Quaternion(bo.matrix_local.to_3x3().inverted() @ axis, math.radians(deg)); turns[n] = pb.rotation_quaternion.copy()
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); me2 = ev.to_mesh()
    spread = [v.co.copy() for v in me2.vertices]; ev.to_mesh_clear()
    tm = bpy.data.meshes.new('JunoBodySpread'); tm.from_pydata([tuple(q) for q in spread], [], [list(p.vertices) for p in body.data.polygons]); tm.update()   # geometry only: no old weights to add to
    tb = bpy.data.objects.new('JunoBodySpread', tm); scene.collection.objects.link(tb)
    ta = arm.copy(); ta.data = arm.data.copy(); ta.name = 'JunoRigSpread'; scene.collection.objects.link(ta)
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = ta; ta.select_set(True)
    bpy.ops.object.mode_set(mode='POSE')
    for n, q in turns.items(): ta.pose.bones[n].rotation_mode = 'QUATERNION'; ta.pose.bones[n].rotation_quaternion = q
    bpy.ops.pose.armature_apply(selected=False); bpy.ops.object.mode_set(mode='OBJECT')   # the spread pose is its rest
    bpy.ops.object.select_all(action='DESELECT'); tb.select_set(True); ta.select_set(True); bpy.context.view_layer.objects.active = ta
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    W = [[(tb.vertex_groups[g.group].name, g.weight) for g in v.groups if g.weight > 0] for v in tb.data.vertices]
    for vg in list(body.vertex_groups): body.vertex_groups.remove(vg)
    for b in sk['bones']: body.vertex_groups.new(name=b['name'])
    for i, ws in enumerate(W):
        for name, w in ws: body.vertex_groups[name].add([i], w, 'REPLACE')
    for n in turns: pose.bones[n].rotation_quaternion = Quaternion((1, 0, 0, 0))
    bpy.context.view_layer.update()
    bpy.data.objects.remove(tb); bpy.data.objects.remove(ta)
    print('BIND: the body\'s weights taken with the arms raised %d degrees and the legs out %d; %d vertices given them' % (SPREAD_ARM, SPREAD_LEG, len(W)))
if args.get('--spread', '1') != '0': spreadBind()
# AND NO LIMB'S WEIGHT WHERE THE LIMB IS NOT BESIDE (the deformation wall's own rule, sources/juno/deform_check.mjs, which reads the result and
# goes RED if the two ever disagree): a weight on an arm, forearm, hand, thigh, shin or foot of the other side than the vertex lies on (more than
# 2 cm from the midline), or more than two bones along the skeleton from the vertex's strongest bone, carries the vertex with a limb it is not
# part of — taken off and the vertex's weights summed to one again. (Taken in the spread pose, the arms' weight on the torso's sides had fallen
# from 0.31 to 0.12; this is the rest.)
PARENT = {b['name']: b['parent'] for b in sk['bones']}
def chainUp(n):
    out = [n]
    while PARENT.get(n): n = PARENT[n]; out.append(n)
    return out
def hops(x, y):
    A, Bc = chainUp(x), chainUp(y); c = next(n for n in A if n in Bc); return A.index(c) + Bc.index(c)
LIMB = ('arm', 'fore', 'hand', 'thigh', 'shin', 'foot')
limbSide = lambda n: n[-1] if n[:-1] in LIMB and n[-1] in 'LR' else ''
def cleanLimbs(o):
    names = {g.index: g.name for g in o.vertex_groups}; removed = 0; worst = 0.0
    for v in o.data.vertices:
        ws = [(names[g.group], g.weight) for g in v.groups if g.weight > 0]
        if not ws: continue
        own = max(ws, key=lambda x: x[1])[0]; at = 'L' if v.co.x > 0.02 else 'R' if v.co.x < -0.02 else ''   # Blender's x is the game's
        drop = [(n, w) for n, w in ws if limbSide(n) and ((at and limbSide(n) != at) or hops(own, n) > 2)]
        if not drop: continue
        keep = sum(w for n, w in ws) - sum(w for n, w in drop)
        for n, w in drop: o.vertex_groups[n].remove([v.index]); removed += 1; worst = max(worst, w)
        if keep > 0:
            for n, w in ws:
                if (n, w) not in drop: o.vertex_groups[n].add([v.index], w / keep, 'REPLACE')
    print('LIMBS: %d weights of a limb not beside its vertex taken off the body, the largest %.2f' % (removed, worst))
cleanLimbs(body)
# EACH PIECE TAKES THE WEIGHTS OF THE BODY VERTEX IT WAS GROWN FROM (10-16, the supervisor: "the standard transfer done exactly"): dress.py
# keeps on every garment vertex the index of the body vertex it was pushed out from (`src`), and the skin is the body itself, cut. The nearest
# surface had been asked instead, and on the torso's sides under a hanging arm the nearest is the ARM: 1,256 jacket and tee vertices took up to
# 0.34 of an arm's weight, and in the Mute grab the tee was pulled 96 mm into the body. Copied BEFORE the budget's decimation (which carries
# vertex groups across a collapse by interpolation; an index it would not keep). The eyes ride the head whole; the soles their foot.
groupName = {g.index: g.name for g in body.vertex_groups}
bodyW = [[(groupName[g.group], g.weight) for g in v.groups if g.weight > 0] for v in body.data.vertices]
for n in PIECES:
    o = bpy.data.objects[n]
    for g in sk['bones']:
        if g['name'] not in o.vertex_groups: o.vertex_groups.new(name=g['name'])
    allV = list(range(len(o.data.vertices)))
    if n.startswith('JunoEye'): o.vertex_groups['head'].add(allV, 1.0, 'REPLACE'); continue
    if n.startswith('sole'): o.vertex_groups['foot' + n[-1]].add(allV, 1.0, 'REPLACE'); continue
    src = o.data.attributes.get('src')
    if src is None: raise SystemExit('EXPORT: %s carries no `src` (the body vertex each of its vertices was grown from) — dress it again' % n)
    S = [d.value for d in src.data]; bad = [i for i, x in enumerate(S) if not (0 <= x < len(bodyW))]
    if bad: raise SystemExit('EXPORT: %s has %d vertices whose `src` is no body vertex' % (n, len(bad)))
    for i, x in enumerate(S):
        for name, w in bodyW[x]: o.vertex_groups[name].add([i], w, 'REPLACE')
    o.data.attributes.remove(src)   # read; the file never carries it
    print('WEIGHTS %s: %d vertices, each its source body vertex\'s weights' % (n, len(S)))
# THE BUDGET: each piece decimated by one share (its weights carried by the collapse), then split safely
for n in PIECES:
    o = bpy.data.objects[n]
    if n.startswith('JunoEye'): decimate(o, eyeT / tris(o))
    elif n not in KEEP: decimate(o, share)
for n in PIECES: triangulateSafely(bpy.data.objects[n])
for n in PIECES:
    o = bpy.data.objects[n]
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
    o.parent = arm; am = o.modifiers.new('Armature', 'ARMATURE'); am.object = arm
# THE UPPER LID FOLLOWS THE LOOK (10-16; the supervisor's condition 2): "During steady fixation, the eye and lid assumed essentially equal
# average positions" (Becker & Fuchs, J Neurophysiol 1988;60(4):1227-52, PubMed 3193155). The base's lids are sculpted and stay put, so the
# game's look up of 0.35 rad left the pupil 48 % open, 16 % up and toward the nose. Four morph targets on the skin, made here on each level's
# own final mesh (Blender applies no modifier to a mesh with shape keys, so they come after the weights): lidUpL/R and lidDownL/R — the upper
# lid turned about its eye's centre, round the axis across the face, by the game's whole look (EYE_PITCH, 20.05 degrees) at its margin, falling
# off to nothing at the brow and at the corners; the game sets each by its eye's own pitch over the look's full turn, one to one.
EYE_PITCH = math.degrees(0.35)
def lidFollow(o):
    me = o.data; eyes = []
    for n in ('JunoEye.L', 'JunoEye.R'):
        e = bpy.data.objects[n]; inv = o.matrix_world.inverted(); P = [inv @ (e.matrix_world @ v.co) for v in e.data.vertices]; c = sum(P, Vector()) / len(P); r = sum((q - c).length for q in P) / len(P)   # in the skin's own space
        eyes.append((n[-1], c, r))
    if not me.shape_keys: o.shape_key_add(name='Basis', from_mix=False)
    fwd, up = Vector((0, -1, 0)), Vector((0, 0, 1))
    for side, c, r in eyes:
        across = Vector((1 if c.x > 0 else -1, 0, 0))   # toward this eye's ear
        lid = []   # (vertex, its elevation over the eye, its azimuth toward the ear, its distance from the eye's centre)
        for v in me.vertices:
            q = v.co - c; d = q.length
            if d < r or d > r + 0.016 or q.dot(fwd) < -0.004: continue
            el = math.degrees(math.atan2(q.dot(up), q.dot(fwd))); az = math.degrees(math.atan2(q.dot(across), q.dot(fwd)))
            if el > -8 and abs(az) < 62: lid.append((v.index, el, az, d))
        # the margin: in each 5-degree slice across the eye, the lowest point of the upper lid that lies on the ball (within 3 mm of it)
        margin = {}
        for i, el, az, d in lid:
            if d < r + 0.003 and el > 0: k = int((az + 62) // 5); margin[k] = min(margin.get(k, 90.0), el)
        if not margin: print('LID %s: no margin found' % side); continue
        ss = lambda a, b, x: 0.0 if x <= min(a, b) and a < b else 1.0 if x >= max(a, b) and a < b else (lambda t: t * t * (3 - 2 * t))(max(0.0, min(1.0, (x - a) / (b - a))))
        def weight(el, az, d):
            k = int((az + 62) // 5); m = margin.get(k) or min(margin.values())
            if el < m - 6: return 0.0   # the lower lid and the ball's own rim stay
            w = 1.0 - ss(m + 14, m + 40, el)                 # the lid moves whole up to 14 degrees over its margin, then hands over to the brow
            w *= 1.0 - ss(38, 60, abs(az))                    # the corners stay
            w *= 1.0 - ss(r + 0.008, r + 0.016, d)            # the skin near the ball moves; the brow's does not
            return w
        W = {i: weight(el, az, d) for i, el, az, d in lid}
        for name, sign in (('lidUp' + side, 1), ('lidDown' + side, -1)):
            k = o.shape_key_add(name=name, from_mix=False)
            for i, w in W.items():
                if w <= 0: continue
                t = math.radians(sign * EYE_PITCH * w); q = me.vertices[i].co - c   # turned about the axis across the face: up is from -y toward +z
                k.data[i].co = c + Vector((q.x, q.y * math.cos(t) + q.z * math.sin(t), -q.y * math.sin(t) + q.z * math.cos(t)))
        mid = min(margin, key=lambda k: abs(k * 5 - 62 + 2.5))   # the slice nearest straight ahead that has a margin (a coarse level may leave the middle one empty)
        print('LID %s: %d vertices of the upper lid move (%d whole); the margin %.1f degrees up at %.1f degrees across (the slice nearest straight ahead), %d slices found' % (side, sum(1 for w in W.values() if w > 0), sum(1 for w in W.values() if w > 0.999), margin[mid], mid * 5 - 62 + 2.5, len(margin)))
lidFollow(bpy.data.objects['JunoSkin'])
if args.get('--with-body', '0') == '1': lidFollow(bpy.data.objects['JunoBody'])
# THE JOINTS' CORRECTIVES (10-16; the supervisor's order: "a corrective morph per knee, driven by the knee's bend angle (pose-space, the lid
# follow's own mechanism, made in the pipeline)"). Blended matrices collapse a joint at a deep bend: the knees kept 66–67 % of their flesh in
# the 5-0. At each of a few bends past rest — the child bone turned about the joint's own hinge (square to the plane of the two bones at
# rest), its parent still — each piece the joint moves is evaluated twice: skinned as the game skins it (blended matrices), and skinned by
# DUAL QUATERNIONS (Blender's own "Preserve Volume"; Kavan et al. 2008), which turn the flesh about the joint instead of averaging it across.
# (10-16: the first target was a delta mush — Blender's Corrective Smooth — and it SHRANK the knee: its morphs pushed 116 of 142 vertices
# near the knee inward, and the knees kept 51–56 % where blended matrices alone kept 66: a smoothing is no volume.) The difference, carried back through each vertex's own blended matrix to where the vertex is before the bones move it (a morph is added before
# skinning, in three as in Blender), is the morph `<joint>_<degrees>`: the game and the walls read the bends from the names and set each by the
# joint's own bend, between its neighbours. CORRECTIVES (by `--correctives` 0 to make none) are the keys, read off the game's own motion.
JOINT_KEYS = {'kneeL': ('thighL', 'shinL', (30, 60, 90, 110, 135)), 'kneeR': ('thighR', 'shinR', (30, 60, 90, 110, 135)), 'elbowL': ('armL', 'foreL', (30, 60, 90)), 'elbowR': ('armR', 'foreR', (30, 60, 90))}   # the game bends a knee 100° past rest, an elbow 72° (deform_check's reading); 45° apart, a grab between two keys kept 89.5 %
def correctives(objs):
    if args.get('--correctives', '1') == '0': return
    pose = arm.pose
    for jn, (pa, ch, keys) in JOINT_KEYS.items():
        bp, bc = arm.data.bones[pa], arm.data.bones[ch]
        dp = (bp.tail_local - bp.head_local).normalized(); dc = (bc.tail_local - bc.head_local).normalized()
        hinge = dp.cross(dc).normalized()   # turning the child about this, the angle between the two lines grows
        def carries(o):   # a piece the joint moves: some vertex weighted to one of its two bones (every piece names all the bones' groups)
            idx = {o.vertex_groups[n].index for n in (pa, ch) if n in o.vertex_groups}
            return any(g.group in idx and g.weight > 0 for v in o.data.vertices for g in v.groups)
        movers = [o for o in objs if not o.name.startswith('JunoEye') and carries(o)]
        for o in movers:
            if not o.data.shape_keys: o.shape_key_add(name='Basis', from_mix=False)
        for deg in keys:
            pb = pose.bones[ch]; pb.rotation_mode = 'QUATERNION'
            local = bc.matrix_local.to_3x3().inverted() @ hinge
            pb.rotation_quaternion = Quaternion(local, math.radians(deg)); bpy.context.view_layer.update()
            D = {b.name: (b.matrix @ b.bone.matrix_local.inverted()) for b in pose.bones}   # each bone's own move, rest to posed
            moved = 0
            for o in movers:
                am = next(m for m in o.modifiers if m.type == 'ARMATURE')
                am.use_deform_preserve_volume = False; bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
                ev = o.evaluated_get(dg); mP = ev.to_mesh(); P = [v.co.copy() for v in mP.vertices]; ev.to_mesh_clear()
                am.use_deform_preserve_volume = True; bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
                ev = o.evaluated_get(dg); mC = ev.to_mesh(); C = [v.co.copy() for v in mC.vertices]; ev.to_mesh_clear()
                am.use_deform_preserve_volume = False
                gname = {g.index: g.name for g in o.vertex_groups}; deltas = {}
                for v in o.data.vertices:
                    d = C[v.index] - P[v.index]
                    if d.length < 1e-5: continue
                    M = Matrix(((0, 0, 0), (0, 0, 0), (0, 0, 0))); wsum = 0
                    for g in v.groups:
                        n = gname[g.group]
                        if n in D and g.weight > 0: M = M + D[n].to_3x3() * g.weight; wsum += g.weight
                    if wsum <= 0: continue
                    try: deltas[v.index] = M.inverted() @ d
                    except ValueError: pass
                if not deltas: continue   # a piece this bend leaves as it was carries no key for it
                key = o.shape_key_add(name='%s_%d' % (jn, deg), from_mix=False)
                for i, d in deltas.items(): key.data[i].co = o.data.vertices[i].co + d
                moved += len(deltas)
            pb.rotation_quaternion = Quaternion((1, 0, 0, 0)); bpy.context.view_layer.update()
            print('CORRECTIVE %s_%d: %d vertices over %d pieces (%s)' % (jn, deg, moved, len(movers), ', '.join(o.name for o in movers)))
correctives([bpy.data.objects[n] for n in PIECES] + ([bpy.data.objects['JunoBody']] if args.get('--with-body', '0') == '1' else []))
# the sky each vertex sees: against every piece at once
dg = bpy.context.evaluated_depsgraph_get(); verts, polys = [], []
for n in PIECES:
    me = bpy.data.objects[n].data; base = len(verts); verts += [v.co.copy() for v in me.vertices]; polys += [[base + i for i in p.vertices] for p in me.polygons]
bvh = BVHTree.FromPolygons(verts, polys)
DIRS = [Vector((math.cos(a) * math.sin(e), math.sin(a) * math.sin(e), math.cos(e))) for e in (0.35, 0.8, 1.2) for a in [k * math.pi / 3 + e for k in range(6)]]
for n in PIECES:
    me = bpy.data.objects[n].data; occ = me.attributes.new('_OCC', 'FLOAT', 'POINT') if '_OCC' not in me.attributes else me.attributes['_OCC']
    for v in me.vertices:
        nrm = v.normal.normalized(); t = nrm.orthogonal().normalized(); b2 = nrm.cross(t); open_ = 0
        for d in DIRS:
            w = (t * d.x + b2 * d.y + nrm * d.z).normalized(); hit = bvh.ray_cast(v.co + nrm * 0.002, w, 0.12)
            if hit[0] is None: open_ += 1
        occ.data[v.index].value = open_ / len(DIRS)
bpy.ops.object.select_all(action='DESELECT')
if args.get('--with-body', '0') == '1':
    # A TEST FILE ONLY (sources/juno/deform_check.mjs reads it, never the game): the closed body under the clothes, on the weights every piece
    # took its own from — limited to four a vertex and normalized as the pieces are — so a wall can read the deforming FLESH (its volume at
    # each joint, a garment or a limb pushed into it), not a cut skin and cloth sheets
    bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active = body
    bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
else:
    for o in list(scene.collection.objects):
        if o.name == 'JunoBody': bpy.data.objects.remove(o)
# every mesh named for its piece (10-16: the body's mesh still carried the base's own name, 'female_v006lowresUV.001', and the eyes'
# 'male_v008Eyes.002' — three names a mesh of several materials by its MESH's name, so the deformation wall found no JunoBody in its file):
# what a file says a piece is, it is
for o in scene.objects:
    if o.type == 'MESH' and o.data.name != o.name: o.data.name = o.name
bpy.ops.export_scene.gltf(filepath=args['--out'], export_format='GLB', export_yup=True, export_skins=True, export_animations=False, export_attributes=True)
tot = 0
for n in PIECES:
    me = bpy.data.objects[n].data; t3 = sum(len(p.vertices) - 2 for p in me.polygons); tot += t3
print('JUNO LOD %d: %d pieces, %d triangles (budget %d) -> %s' % (LOD, len(PIECES), tot, BUDGET, args['--out']))
for n in PIECES:
    bm = bmesh.new(); bm.from_mesh(bpy.data.objects[n].data); op = sum(1 for e in bm.edges if e.is_boundary); pin = sum(1 for e in bm.edges if len(e.link_faces) > 2); chi = len(bm.verts) - len(bm.edges) + len(bm.faces); bm.free()
    print('  %-11s %6d triangles · V-E+F %d · open %d · on 3+ %d' % (n, tris(bpy.data.objects[n]), chi, op, pin))
