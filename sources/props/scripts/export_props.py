# THE PROPS GLB (10-17): every `prop_<kind>` mesh — the simple shapes of scripts/simplify_props.py and the kinds kept as they were (the car,
# made light by scripts/build_props.py) — written into one GLB, one mesh a kind at the origin; the bake sources (`hi_<kind>`) are left out.
# tools/props_col.mjs then writes the same triangles as the sim's collision (one source: this GLB).
import bpy

for o in bpy.data.objects:
    o.select_set(False)
    o.hide_render = False
props = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('prop_')]
for o in props:
    o.select_set(True)
bpy.context.view_layer.objects.active = props[0]
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True, export_image_format='WEBP', export_yup=True,
                          export_texcoords=True, export_normals=True, export_materials='EXPORT')
for o in props:
    o.data.calc_loop_triangles()
print('EXPORTED', OUT, ', '.join(f'{o.name} {len(o.data.loop_triangles)} tris' for o in props))
