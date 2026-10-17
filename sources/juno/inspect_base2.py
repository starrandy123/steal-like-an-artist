"""The bundle's armatures, collections and the two male bodies' landmarks (nothing in the file run).
Usage: sh sources/juno/blender.sh <the bundle .blend> --python inspect_base2.py   (-b --factory-startup --disable-autoexec)"""
import bpy
print('ARMATURES', [o.name for o in bpy.data.objects if o.type == 'ARMATURE'])
print('COLLECTIONS', [c.name for c in bpy.data.collections])
for name in ['GEO-body_male_realistic', 'GEO-body_male_stylized']:
    o = bpy.data.objects[name]; me = o.data; mw = o.matrix_world
    P = [v.co.copy() for v in me.vertices]   # the object's own space (the bundle lays the bodies out side by side)
    zs = [p.z for p in P]; xs = [p.x for p in P]; ys = [p.y for p in P]
    top = max(zs); bot = min(zs)
    print(name, 'height %.3f (z %.3f..%.3f) x %.3f..%.3f y %.3f..%.3f · location %s · mods %s' % (top - bot, bot, top, min(xs), max(xs), min(ys), max(ys), tuple(round(c, 3) for c in o.location), [(m.type, getattr(m, 'levels', None), getattr(m, 'total_levels', None)) for m in o.modifiers]))
    # the crotch: the highest point of the gap between the legs (near x 0, the lowest vertex of the torso's underside around x = 0)
    mid = [p for p in P if abs(p.x) < 0.01]
    print('  midline z range %.3f..%.3f, vertices %d' % (min(p.z for p in mid), max(p.z for p in mid), len(mid)))
    # cross-section widths every 5 cm of height (the torso and legs only: |x| < 0.25)
    for z in [round(bot + k * 0.05, 3) for k in range(int((top - bot) / 0.05) + 1)]:
        band = [p for p in P if abs(p.z - z) < 0.012]
        if not band: continue
        bx = [p.x for p in band]
        print('  z %.2f: x %.3f..%.3f (%d)' % (z, min(bx), max(bx), len(band)))
