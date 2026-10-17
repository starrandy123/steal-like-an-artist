"""THE BASE BODY'S JOINTS, READ OFF ITS OWN SURFACE (10-16): Blender Studio's realistic male base (CC0) cuts its surface into sculpt face sets
along the limbs' joints — the upper arm from the forearm at the elbow, the shin from the foot at the ankle. Each ring between two sets
circles a limb, and its centre lies on the limb's axis: the elbows, wrists, knees and ankles. The shoulder and the hip rings are slanted (over
the deltoid to the armpit; from the hip's side to the crotch): their joints are taken where each limb's own axis (its set's principal line)
passes the ring. Prints them in the game's rig space (x across, y up, z toward the nose) after the base is scaled to the game's height.
Usage: sh sources/juno/blender.sh --python landmarks.py -- --bundle <the .blend> [--body GEO-body_male_realistic]"""
import bpy, sys, json
import numpy as np
from collections import defaultdict
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
args = dict(zip(argv[0::2], argv[1::2]))
BODY = args.get('--body', 'GEO-body_male_realistic')
with bpy.data.libraries.load(args['--bundle'], link=False) as (src, dst):
    dst.objects = [BODY]
obj = dst.objects[0]
me = obj.data
V = np.array([v.co[:] for v in me.vertices])
fs = me.attributes['.sculpt_face_set'].data
setv = defaultdict(set)
for p in me.polygons:
    setv[fs[p.index].value].update(p.vertices)
ring = defaultdict(set)
ef = defaultdict(list)
for p in me.polygons:
    for e in p.edge_keys: ef[e].append(fs[p.index].value)
for e, s2 in ef.items():
    if len(s2) == 2 and s2[0] != s2[1]: ring[tuple(sorted(s2))].update(e)
def centre(a, b): return V[list(ring[tuple(sorted((a, b)))])].mean(0)
def axis(sid):
    P = V[list(setv[sid])]; c = P.mean(0); u, s, vt = np.linalg.svd(P - c); return c, vt[0]
def onAxis(sid, point):
    c, d = axis(sid); return c + d * np.dot(point - c, d)
# which set is which (the realistic male's own numbering, read by inspect_base4.py): torso 1, head and neck 17, pelvis 18, abdomen 19,
# upper arms 21 (+x) / 20, forearms 12 / 11, palms 9 / 10, thighs 24 / 23, shins 15 / 16, feet 14 / 13
S = {'L': dict(up=21, fore=12, palm=9, thigh=24, shin=15, foot=14), 'R': dict(up=20, fore=11, palm=10, thigh=23, shin=16, foot=13)}
J = {}
for sd, s in S.items():
    J['elbow' + sd] = centre(s['up'], s['fore'])
    J['wrist' + sd] = centre(s['fore'], s['palm'])
    J['knee' + sd] = centre(s['thigh'], s['shin'])
    J['ankle' + sd] = centre(s['shin'], s['foot'])
    J['shoulder' + sd] = onAxis(s['up'], centre(1, s['up']))
    J['hip' + sd] = onAxis(s['thigh'], centre(18, s['thigh']))
    P = V[list(setv[s['foot']])]; J['toe' + sd] = np.array([P[:, 0].mean(), P[:, 1].min(), P[:, 2].min()])   # the foot's front (−Y), on the ground
    P = V[list(setv[s['palm']])]; J['hand' + sd] = P.mean(0)
J['neckBase'] = centre(1, 17)
J['waist'] = centre(1, 19)
J['pelvisTop'] = centre(18, 19)
J['headTop'] = V[list(setv[17])][V[list(setv[17])][:, 2].argmax()]
J['jaw'] = centre(17, 22)
height = V[:, 2].max() - V[:, 2].min()
GAME_TOP = float(args.get('--top', '1.78'))
k = GAME_TOP / height
out = {name: [round(float(p[0] * k), 4), round(float(p[2] * k), 4), round(float(-p[1] * k), 4)] for name, p in J.items()}   # Blender (x, y, z) → game (x, z, −y), scaled
print('BASE: ' + BODY + ' height %.3f m, scaled by %.4f to %.2f' % (height, k, GAME_TOP))
for name in sorted(out): print('  %-10s %s' % (name, out[name]))
if '--out' in args: json.dump({'body': BODY, 'scale': k, 'joints': out}, open(args['--out'], 'w'), indent=1)
