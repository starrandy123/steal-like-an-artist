# KILN YARD'S PROPS (inside the fence, ridden into, so drawn = collided): each Poly Haven CC0 model joined into one mesh in its own world
# frame (refreshed first: the importer's matrices), stood with its foot at y 0 and its middle at x = z = 0, made light (collapse decimation
# to its triangle budget, evaluated once), its textures cut to base colour at 256, and written into one GLB — one mesh a kind, at the origin.
# The game draws these meshes and its collision takes the SAME triangles (tools/props_col.mjs writes them from this GLB: one source).
import bpy
import bmesh
import math
from mathutils import Matrix, Vector

try:
    OUT   # a batch's var
except Exception:
    OUT = '/path/to/waxline/build/assets/kilnyard_props.glb'
BUDGET = {'barrel': 1500, 'tyre': 1200, 'crate': 1600, 'car': 4000}
# SIMPLE (a batch's var, 10-17): the kinds a board can reach the top of, made simple shapes by scripts/simplify_props.py (the supervisor's
# pre-ruling: a reachable top deeper than 2 cm takes a simpler mesh, drawn = collided). Here each is kept WHOLE as `hi_<kind>` (not made
# light, never exported): it is what the simple shape's texture is baked from. With SIMPLE set, the export is scripts/export_props.py's.
try:
    SIMPLE   # a batch's var
except Exception:
    SIMPLE = []
# (a few of each in a park: their own detail is affordable — at 220 a barrel showed its facets, 10-16; the utility box, wall-mounted with
#  no back, came out twisted once its back was filled: left out)
# (the hydrant and the bin are left out: decimated, their shells let rays through — tests/props_solid.mjs, 10-16)
bpy.context.view_layer.update()

made = []
for kind, budget in BUDGET.items():
    parts = [o for o in bpy.data.objects if o.type == 'MESH' and o.get('kind') == kind]
    if not parts:
        print('MISSING', kind)
        continue
    verts, faces, uvs, mats = [], [], [], []
    for o in parts:
        me = o.data
        W = o.matrix_world
        base = len(verts)
        for v in me.vertices:
            verts.append(W @ v.co)
        slot = []
        for sl in o.material_slots:   # the object's slots (a model may link its materials to the object, not the mesh)
            m = sl.material
            if m not in mats:
                mats.append(m)
            slot.append(mats.index(m))
        uvl = me.uv_layers.active.data if me.uv_layers.active else None
        # a mirrored part (its matrix turns space inside out) has its faces wound the other way once placed: wound back, or the faces
        # would look inward and the board's rays (front faces only) would pass through them
        flip = W.determinant() < 0
        for p in me.polygons:
            vs = [base + i for i in p.vertices]
            uv = [tuple(uvl[li].uv) for li in p.loop_indices] if uvl else None
            if flip:
                vs = vs[::-1]
                uv = uv[::-1] if uv else None
            faces.append((vs, slot[p.material_index] if p.material_index < len(slot) else 0, uv))
    lo = Vector((min(v.x for v in verts), min(v.y for v in verts), min(v.z for v in verts)))
    hi = Vector((max(v.x for v in verts), max(v.y for v in verts), max(v.z for v in verts)))
    shift = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))   # the foot at 0, the middle at the origin (Blender z is up)
    me2 = bpy.data.meshes.new('prop_' + kind)
    me2.from_pydata([tuple(v - shift) for v in verts], [], [f[0] for f in faces])
    me2.update()
    layer = me2.uv_layers.new(name='UVMap')
    for p, f in zip(me2.polygons, faces):
        p.material_index = f[1]
        if f[2]:
            for li, t in zip(p.loop_indices, f[2]):
                layer.data[li].uv = t
    for m in mats:
        if m is not None:
            me2.materials.append(m)
    # A SHELL THE BOARD MEETS FROM OUTSIDE: coincident vertices joined, every open border filled (a wall-mounted box has no back), the faces
    # turned to look out — before it is made light (decimating an open shell tears it). A tyre is laid flat (upright, its hole lets a board in)
    bm = bmesh.new()
    bm.from_mesh(me2)
    if kind == 'tyre':
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0.0, 0.0, 0.0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'))
        xs = [v.co.x for v in bm.verts]; ys = [v.co.y for v in bm.verts]; zmin = min(v.co.z for v in bm.verts)
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        for v in bm.verts:   # laid flat: its middle back over the origin, its foot at 0
            v.co.x -= cx; v.co.y -= cy; v.co.z -= zmin
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
    border = [e for e in bm.edges if e.is_boundary]
    if border:
        bmesh.ops.holes_fill(bm, edges=border, sides=0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me2)
    bm.free()
    me2.update()
    # smooth where the model is round, sharp at its edges (rebuilt from its faces, the mesh had lost the model's shading: every face flat)
    me2.shade_smooth()
    me2.set_sharp_from_angle(angle=math.radians(35))
    ob = bpy.data.objects.new(('hi_' if kind in SIMPLE else 'prop_') + kind, me2)
    bpy.context.scene.collection.objects.link(ob)
    me2.calc_loop_triangles()
    n = len(me2.loop_triangles)
    if n > budget and kind not in SIMPLE:
        mod = ob.modifiers.new('budget', 'DECIMATE')
        mod.decimate_type = 'COLLAPSE'
        mod.ratio = budget / n
        mod.use_collapse_triangulate = True
        ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
        light = bpy.data.meshes.new_from_object(ev)
        ob.modifiers.remove(mod)
        ob.data = light
    ob.data.calc_loop_triangles()
    md = ob.data
    c = Vector((0.0, 0.0, (hi.z - lo.z) / 2))
    out_area = sum(t.area for t in md.loop_triangles if t.normal.dot(t.center - c) > 0)
    all_area = sum(t.area for t in md.loop_triangles) or 1.0
    flipped = sum(1 for o in parts if o.matrix_world.determinant() < 0)
    print(f'{kind}: {flipped} mirrored parts wound back; faces looking out {100 * out_area / all_area:.0f}% of the area')
    size = hi - lo
    print(f'{kind}: {len(parts)} objects, {n} triangles -> {len(ob.data.loop_triangles)}; size {size.x:.2f} x {size.y:.2f} x {size.z:.2f} m (Blender x, y, z)')
    made.append(ob)

# colour only, 256 (a prop is seen from 1–30 m; its shape is its triangles)
used, whole = set(), set()   # whole: the images a kept-whole `hi_` mesh reads (a bake reads them at their own 1k)
for ob in made:
    for m in ob.data.materials:
        if not (m and m.use_nodes):
            continue
        bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if bsdf is None:
            continue
        for sock in ('Normal', 'Roughness', 'Metallic'):
            for l in list(bsdf.inputs[sock].links):
                m.node_tree.links.remove(l)
        bsdf.inputs['Roughness'].default_value = 0.7
        bsdf.inputs['Metallic'].default_value = 0.3 if any(k in m.name.lower() for k in ('barrel', 'hydrant', 'utility', 'trash', 'metal')) else 0.0
        for l in bsdf.inputs['Base Color'].links:
            node = l.from_node
            while node and node.type != 'TEX_IMAGE' and node.inputs:
                node = next((i.links[0].from_node for i in node.inputs if i.links), None)
            if node and node.type == 'TEX_IMAGE' and node.image:
                used.add(node.image)
                if ob.name.startswith('hi_'):
                    whole.add(node.image)
for im in used:
    if im.size[0] > 256 and im not in whole:   # (only what is exported as it is is cut to 256)
        im.scale(256, 256)
if SIMPLE:
    print('KEPT WHOLE for the bake:', [o.name for o in made if o.name.startswith('hi_')], '· the rest made light:', [o.name for o in made if o.name.startswith('prop_')])
else:
    for o in bpy.context.scene.objects:
        o.select_set(False)
    for ob in made:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = made[0]
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True, export_image_format='WEBP', export_yup=True, export_texcoords=True, export_normals=True, export_materials='EXPORT')
    print('EXPORTED', OUT, [o.name for o in made], 'images', sorted(f'{im.name} {im.size[0]}' for im in used))
