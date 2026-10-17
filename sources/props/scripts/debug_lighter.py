# WHERE A DECIMATED COPY OF AN INSERT LANDS, against its source: their matrices, their parents, their mesh bounds in local space
import bpy
from mathutils import Vector
def bounds(me):
    xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]; zs = [v.co.z for v in me.vertices]
    return (round(min(xs), 2), round(max(xs), 2), round(min(ys), 2), round(max(ys), 2), round(min(zs), 2), round(max(zs), 2))
for nm in ('window_centered_double_01', 'door_garage_double_01', 'wall_window_centered_double_01'):
    o = bpy.data.objects.get(nm)
    print(nm, 'parent', o.parent.name if o.parent else None, 'loc', tuple(round(c, 2) for c in o.location), 'world', tuple(round(c, 2) for c in o.matrix_world.translation), 'scale', tuple(round(c, 3) for c in o.matrix_world.to_scale()), 'local bounds', bounds(o.data))
    tmp = bpy.data.objects.new('tmp_' + nm, o.data)
    bpy.context.scene.collection.objects.link(tmp)
    mod = tmp.modifiers.new('d', 'DECIMATE'); mod.ratio = 0.3
    dg = bpy.context.evaluated_depsgraph_get()
    ev = tmp.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev)
    print('   decimated', len(me.polygons), 'faces, local bounds', bounds(me), 'tmp world', tuple(round(c, 2) for c in tmp.matrix_world.translation))
    bpy.data.objects.remove(tmp, do_unlink=True)
