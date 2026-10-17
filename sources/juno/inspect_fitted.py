"""The fitted body's face sets by region, in the game's rest pose (Blender space: z up, the front at -y): each set's centre and its z span —
the regions the clothes are cut from. Usage: sh sources/juno/blender.sh work/juno_fitted.blend --python inspect_fitted.py"""
import bpy
from collections import defaultdict
o = bpy.data.objects['JunoBody']; me = o.data; fs = me.attributes['.sculpt_face_set'].data
sets = defaultdict(list)
for p in me.polygons: sets[fs[p.index].value].append(p.index)
for k in sorted(sets, key=lambda k: -len(sets[k]))[:30]:
    vs = {v for f in sets[k] for v in me.polygons[f].vertices}; P = [me.vertices[v].co for v in vs]
    print('set %3d %5d faces · centre (%.3f %.3f %.3f) · x %.3f..%.3f · y %.3f..%.3f · z %.3f..%.3f' % (k, len(sets[k]), sum(p.x for p in P) / len(P), sum(p.y for p in P) / len(P), sum(p.z for p in P) / len(P), min(p.x for p in P), max(p.x for p in P), min(p.y for p in P), max(p.y for p in P), min(p.z for p in P), max(p.z for p in P)))
print('toes and small sets:', len([k for k in sets if len(sets[k]) < 100]), 'sets under 100 faces')
