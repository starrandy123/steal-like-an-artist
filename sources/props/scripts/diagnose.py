# WHERE A KIT MODULE'S TRIANGLES ARE, AND WHY A DOOR SHOWS THE SKY: each piece's triangles as imported, after joining coincident vertices,
# after dissolving flat faces (kept apart by material only, then also by UV island), and each material's alpha settings.
import bpy
import bmesh
import math

def count(me):
    me.calc_loop_triangles()
    return len(me.loop_triangles)

def dissolved(src, delimit):
    me = src.data.copy()
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(1.0), use_dissolve_boundaries=False, verts=bm.verts, edges=bm.edges, delimit=delimit)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    n = count(me)
    bpy.data.meshes.remove(me)
    return n

NAMES = ['wall_standard_standard_01', 'wall_window_centered_double_01', 'window_centered_double_01', 'wall_door_garage_double_01', 'door_garage_double_01',
         'wall_door_recessed_large_01', 'door_recessed_large_01', 'wall_door_recessed_small_01', 'door_recessed_small_01', 'door_recessed_small_02', 'crown_standard_standard_01', 'base_standard_standard_01']
for nm in NAMES:
    o = bpy.data.objects.get(nm)
    if o is None:
        print('MISSING', nm)
        continue
    uvs = len(o.data.uv_layers)
    print(f"{nm:34s} raw {count(o.data):5d}  dissolved(material) {dissolved(o, {'MATERIAL'}):5d}  dissolved(material+uv) {dissolved(o, {'MATERIAL', 'UV'}):5d}  uv layers {uvs}  mats {[m.name for m in o.data.materials]}")
for m in bpy.data.materials:
    if 'factory' in m.name:
        bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None) if m.use_nodes else None
        alpha_linked = bool(bsdf and bsdf.inputs['Alpha'].links)
        print(f"material {m.name:44s} blend {getattr(m, 'blend_method', '?')} surface_render {getattr(m, 'surface_render_method', '?')} alpha linked {alpha_linked} alpha {bsdf.inputs['Alpha'].default_value if bsdf else '?'}")
