# WHAT A POLY HAVEN ASSET IS MADE OF, AS IMPORTED: every mesh object (its triangles, its size, its materials) and every image (its size).
# Sent through the Blender MCP's execute_blender_code (safe mode: bpy and the standard library only; it only prints).
import bpy
from mathutils import Vector

def tris(o):
    me = o.data
    me.calc_loop_triangles()
    return len(me.loop_triangles)

total = 0
def by_name(x):
    return x.name

for o in sorted(bpy.data.objects, key=by_name):
    if o.type != 'MESH':
        continue
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    lo = [min(v[i] for v in bb) for i in range(3)]
    hi = [max(v[i] for v in bb) for i in range(3)]
    t = tris(o)
    total += t
    mats = ','.join(m.name for m in o.data.materials if m)
    print(f"{o.name:44s} tris {t:7d}  size {hi[0]-lo[0]:6.2f} x {hi[1]-lo[1]:6.2f} x {hi[2]-lo[2]:6.2f}  at ({lo[0]:.2f},{lo[1]:.2f},{lo[2]:.2f})  mats {mats}")
print('TOTAL TRIANGLES', total)
for im in bpy.data.images:
    if im.size[0]:
        print(f"image {im.name:44s} {im.size[0]}x{im.size[1]} {im.colorspace_settings.name}")
