"""The male bodies' sculpt face sets: each set's face count, centroid and box; and the borders between sets (their centroids) — candidate
joints (nothing in the file run).
Usage: sh sources/juno/blender.sh <the bundle .blend> --python inspect_base4.py   (-b --factory-startup --disable-autoexec)"""
import bpy
from collections import defaultdict
for name in ['GEO-body_male_realistic', 'GEO-body_male_stylized']:
    o = bpy.data.objects[name]; me = o.data
    fs = me.attributes['.sculpt_face_set'].data
    sets = defaultdict(list)
    for p in me.polygons: sets[fs[p.index].value].append(p.index)
    print(name, len(sets), 'face sets')
    for k, fl in sorted(sets.items()):
        vs = {v for f in fl for v in me.polygons[f].vertices}
        xs = [me.vertices[v].co.x for v in vs]; ys = [me.vertices[v].co.y for v in vs]; zs = [me.vertices[v].co.z for v in vs]
        print('  set %d: %d faces · centre (%.3f, %.3f, %.3f) · x %.3f..%.3f z %.3f..%.3f' % (k, len(fl), sum(xs) / len(xs), sum(ys) / len(ys), sum(zs) / len(zs), min(xs), max(xs), min(zs), max(zs)))
    # borders: edges whose two faces are in different sets
    ef = defaultdict(list)
    for p in me.polygons:
        for e in p.edge_keys: ef[e].append(fs[p.index].value)
    border = defaultdict(list)
    for e, s2 in ef.items():
        if len(s2) == 2 and s2[0] != s2[1]:
            key = tuple(sorted(s2)); border[key].extend(e)
    for key, vl in sorted(border.items()):
        vs = set(vl); cx = sum(me.vertices[v].co.x for v in vs) / len(vs); cy = sum(me.vertices[v].co.y for v in vs) / len(vs); cz = sum(me.vertices[v].co.z for v in vs) / len(vs)
        print('  border %s: %d vertices · centre (%.3f, %.3f, %.3f)' % (key, len(vs), cx, cy, cz))
