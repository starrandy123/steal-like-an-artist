# KILN YARD'S BACKDROP, BUILT FROM POLY HAVEN'S CC0 MODULAR KITS (modular_factory_facade and modular_urban_apartments_facade by James Ray Cock,
# modular_fire_escape by Juniix — imported by the Blender MCP's import_asset, CC0): the warehouse whose loading dock the park's dock is (its
# garage doors at the dock's height), a brick factory beside it, the apartments to the east with fire escapes, a brick shed to the west. Every
# building stands OUTSIDE the park's fence and nothing of it reaches over (the camera's world is the fence: view/sightline.js).
# Each kit's 3 m modules are placed bay by bay and storey by storey (a wall and the insert of the same name share one origin: the kits are
# built that way), merged into one mesh a building, flat faces dissolved (the bricks are in the texture, not the geometry), textures cut to
# 512, and written as one GLB the game draws (build/assets/kilnyard_backdrop.glb). Game coordinates (x east, y up, z north) are Blender's
# (x, -z, y): the glTF exporter turns Blender's Z-up into glTF's Y-up.
# Run through the Blender MCP's execute_blender_code (safe mode: bpy, bmesh, mathutils; it prints what it made).
import bpy
import bmesh
import math
from mathutils import Matrix, Vector

OUT = '/path/to/waxline/build/assets/kilnyard_backdrop.glb'


def kit_of(o):
    names = ' '.join(m.name for m in o.data.materials if m)
    if 'factory' in names:
        return 'F'
    if 'apartments' in names:
        return 'A'
    if 'fire_escape' in names:
        return 'E'
    return None


KIT = {'F': {}, 'A': {}, 'E': {}}
for o in bpy.data.objects:
    if o.type == 'MESH' and kit_of(o):
        KIT[kit_of(o)][o.name.split('.')[0]] = o


def piece(kit, name):
    o = KIT[kit].get(name)
    if o is None:
        print('MISSING', kit, name)
    return o


LIGHT = {}
def lighter(o, ratio):
    # a copy of a source with fewer triangles (collapse decimation, evaluated once and kept): for inserts only, never a wall
    if o is None or ratio >= 1:
        return o
    key = (o.name, ratio)
    if key not in LIGHT:
        tmp = bpy.data.objects.new('tmp_' + o.name, o.data)
        bpy.context.scene.collection.objects.link(tmp)
        mod = tmp.modifiers.new('lighter', 'DECIMATE')
        mod.decimate_type = 'COLLAPSE'
        mod.ratio = ratio
        mod.use_collapse_triangulate = True
        ev = tmp.evaluated_get(bpy.context.evaluated_depsgraph_get())
        me = bpy.data.meshes.new_from_object(ev)
        holder = bpy.data.objects.new('light_' + o.name, me)
        bpy.data.objects.remove(tmp, do_unlink=True)
        LIGHT[key] = holder
    return LIGHT[key]


INSERT_RATIO = 0.22
# modules wider than a bay (a 9 m garage covers three, a 6 m one two): set at the far end of the last bay they cover
WIDE = {'door_garage_double_01': 3, 'door_garage_door_01': 2, 'door_garage_door_02': 2, 'door_garage_centered_01': 2}


# the front of a wall module: the side its faces look to (the kits' walls are planes at y = 0)
def front_of(o):
    n = Vector((0.0, 0.0, 0.0))
    for p in o.data.polygons:
        n += p.normal * p.area
    return n.normalized()


FRONT = {k: front_of(piece(k, 'wall_standard_standard_01')) for k in ('F', 'A')}
print('the walls look along', {k: tuple(round(c, 2) for c in v) for k, v in FRONT.items()})


def place(gx, gy, gz, face_deg):
    # a module's frame: its origin at game (gx, gy, gz), turned so its front looks along the game direction face_deg (0 = +z north, 90 = +x)
    return Matrix.Translation((gx, -gz, gy)) @ Matrix.Rotation(math.radians(face_deg), 4, 'Z')


def merge(name, parts):
    # one mesh from many placed pieces: every vertex moved by its piece's matrix, every face with its UVs and its material kept
    verts, faces, uvs, mats, mi = [], [], [], [], []
    for src, M in parts:
        me = src.data
        W = M   # a piece's own mesh coordinates: its object's place on the kit's sheet is not the module's
        base = len(verts)
        for v in me.vertices:
            verts.append(tuple(W @ v.co))
        slot = []
        for m in me.materials:
            if m not in mats:
                mats.append(m)
            slot.append(mats.index(m))
        uvl = me.uv_layers.active.data if me.uv_layers.active else None
        for p in me.polygons:
            faces.append([base + i for i in p.vertices])
            mi.append(slot[p.material_index] if slot else 0)
            uvs.append([tuple(uvl[li].uv) for li in p.loop_indices] if uvl else None)
    me2 = bpy.data.meshes.new(name)
    me2.from_pydata(verts, [], faces)
    me2.update()
    layer = me2.uv_layers.new(name='UVMap')
    for p, fuv in zip(me2.polygons, uvs):
        if fuv:
            for li, t in zip(p.loop_indices, fuv):
                layer.data[li].uv = t
    for m in mats:
        me2.materials.append(m)
    for p, k in zip(me2.polygons, mi):
        p.material_index = k
    ob = bpy.data.objects.new(name, me2)
    bpy.context.scene.collection.objects.link(ob)
    return ob


# A FACADE: `bays` columns of 3 m, `rows` from the ground storey up (each a list of module names, one a bay, left to right as seen from the
# park), standing on game height `ground`, its first bay's left end at `start`, running along `along` (a unit game vector), its front to
# `face_deg`. The base at its foot, the crown along its top.
def facade(kit, start, along, ground, face_deg, rows, base='base_standard_standard_01', crown='crown_standard_standard_01'):
    parts = []
    bays = len(rows[0])
    for s, row in enumerate(rows):
        for i, name in enumerate(row):
            if name is None:   # a bay a wider module (a 9 m garage) already covers
                continue
            # the modules span 3 m to the LEFT of their origin (x -3..0): the origin is the bay's far end along the facade, and a module wider
            # than a bay is set at the far end of the last bay it covers
            k = i + WIDE.get(name, 1) - 1
            gx = start[0] + along[0] * 3 * (k + 1)
            gz = start[1] + along[1] * 3 * (k + 1)
            M = place(gx, ground + 3 * s, gz, face_deg)
            wall = piece(kit, 'wall_' + name) if name != 'standard_standard_01' else piece(kit, 'wall_standard_standard_01')
            if wall:
                parts.append((wall, M))
            insert = lighter(KIT[kit].get(name), INSERT_RATIO)
            if insert is not None and name != 'standard_standard_01':
                parts.append((insert, M))
    top = ground + 3 * len(rows)
    for i in range(bays):
        gx = start[0] + along[0] * 3 * (i + 1)
        gz = start[1] + along[1] * 3 * (i + 1)
        b = piece(kit, base)
        if b:
            parts.append((b, place(gx, ground, gz, face_deg)))
        c = piece(kit, crown)
        if c:
            parts.append((c, place(gx, top, gz, face_deg)))
    return parts


# which way a kit's front must turn to look at the game direction `look` (0 = north +z, 90 = east +x, 180 = south, 270 = west)
def face_for(kit, look):
    f = FRONT[kit]
    have = math.degrees(math.atan2(f.x, -f.y))   # the kit's front as a game heading (Blender y = -game z)
    return look - have


built = []
# 1. THE WAREHOUSE behind the dock: brick, three storeys, its ground storey garage doors at the dock (5.35), its front to the south
W1 = 'F'
ground = ['door_garage_double_01', 'standard_standard_01', 'standard_standard_01', 'door_recessed_large_01', 'door_garage_double_01', 'standard_standard_01',
          'standard_standard_01', 'door_garage_double_01', 'standard_standard_01', 'standard_standard_01', 'door_recessed_small_01', 'door_garage_double_01',
          'standard_standard_01', 'standard_standard_01', 'door_garage_double_01', 'standard_standard_01', 'standard_standard_01', 'standard_standard_01', 'door_recessed_small_02', 'standard_standard_01']
# a 9 m garage module takes three bays: the two after it are left to it
rowG, skip = [], 0
for n in ground:
    if skip:
        skip -= 1
        rowG.append(None)
        continue
    rowG.append(n)
    if n == 'door_garage_double_01':
        skip = 2
upper = ['window_centered_double_01', 'window_centered_large_01', 'window_centered_double_02', 'window_centered_large_02'] * 5
top = ['window_centered_double_01', 'standard_standard_01', 'window_centered_large_02', 'standard_standard_01'] * 5
built.append(('warehouse', facade(W1, (98.9, 73.0), (-1, 0), 5.35, face_for(W1, 180), [rowG, upper[:20], top[:20]])))
# 2. THE FACTORY beside it, above the yard's north-west (4.15)
fac = ['window_centered_large_01', 'window_centered_double_03', 'window_centered_large_03', 'window_centered_double_04'] * 4
built.append(('factory', facade('F', (40.0, 73.0), (-1, 0), 4.15, face_for('F', 180), [['door_window_small_01'] + fac[:12], fac[1:14], fac[2:15]])))
# 3. THE APARTMENTS to the east, four storeys of plaster above the yard (4.15), their front to the west
apt = ['window_centered_double_01', 'standard_standard_01', 'window_centered_large_01', 'standard_standard_01', 'window_centered_double_02', 'standard_standard_01'] * 3
gnd = ['door_window_small_03', 'window_centered_double_01', 'door_centered_small_01', 'window_centered_large_01', 'door_window_small_07', 'window_centered_double_02'] * 3
built.append(('apartments', facade('A', (97.9, 27.5), (0, 1), 4.15, face_for('A', 270), [gnd[:15], apt[:15], apt[1:16]], base='base_standard_01', crown='cornice_standard_standard_01')))
# 4. THE SHED to the west, two storeys of brick above the yard, its front to the east
shed = ['window_centered_large_01', 'standard_standard_01', 'window_centered_double_01', 'standard_standard_01'] * 4
built.append(('shed', facade('F', (-1.0, 72.5), (0, -1), 4.15, face_for('F', 90), [shed[:14], shed[2:16]])))

# the triangles each building may draw (a backdrop seen from 10–80 m; the whole backdrop about 45k)
BUDGET = {'warehouse': 12000, 'factory': 7000, 'apartments': 14000, 'shed': 4000, 'fire_escapes': 5000}
# the facades' None bays (taken by a 9 m garage module) are skipped by piece lookups: drop them before merging
objs = []
for name, parts in built:
    parts = [(s, M) for s, M in parts if s is not None]
    ob = merge('kilnyard_' + name, parts)
    me = ob.data
    me.calc_loop_triangles()
    before = len(me.loop_triangles)
    # flat faces dissolved (the bricks and the stucco are in the textures): planar decimation, UV seams and materials kept
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(1.0), use_dissolve_boundaries=False, verts=bm.verts, edges=bm.edges, delimit={'MATERIAL', 'SEAM', 'UV'})
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    me.calc_loop_triangles()
    flat = len(me.loop_triangles)
    target = BUDGET[name]
    xs = [v.co.x for v in me.vertices]; zs = [-v.co.y for v in me.vertices]; ys = [v.co.z for v in me.vertices]
    print(f'{ob.name}: {len(parts)} pieces, {before} triangles -> {flat} (walls dissolved, inserts at {INSERT_RATIO}) · budget {target}{" OVER" if flat > target else ""}; game x {min(xs):.2f}..{max(xs):.2f} y {min(ys):.2f}..{max(ys):.2f} z {min(zs):.2f}..{max(zs):.2f}')
    objs.append(ob)

# THE DARK BEHIND THE GLASS: one plane a building, 0.9 m behind its wall, as tall and as long as it (what a broken pane or an open door
# shows; without it the sky showed through two of the warehouse's doors)
inside = bpy.data.materials.new('kilnyard_interior')
inside.use_nodes = True
b0 = next(n for n in inside.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
b0.inputs['Base Color'].default_value = (0.035, 0.03, 0.028, 1.0)
b0.inputs['Roughness'].default_value = 1.0
inside.use_backface_culling = False   # seen from the park whichever way its face was made
def interior(name, a, b, y0, y1):
    # a, b: the plane's two ends on the ground, game (x, z); y0..y1 its height
    me = bpy.data.meshes.new(name)
    v = [(a[0], -a[1], y0), (b[0], -b[1], y0), (b[0], -b[1], y1), (a[0], -a[1], y1)]
    me.from_pydata(v, [], [(0, 1, 2, 3)])
    me.materials.append(inside)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob
objs.append(interior('kilnyard_inside_warehouse', (38.9, 73.9), (98.9, 73.9), 5.35, 14.4))
objs.append(interior('kilnyard_inside_factory', (1.0, 73.9), (40.0, 73.9), 4.15, 13.2))
objs.append(interior('kilnyard_inside_apartments', (98.8, 27.5), (98.8, 72.5), 4.15, 13.2))
objs.append(interior('kilnyard_inside_shed', (-1.9, 30.5), (-1.9, 72.5), 4.15, 10.2))

# the fire escapes: on the apartments' second and fifth bays from the north, from the second storey up (the kit's own pieces, as they are)
fe = []
for bay in (2, 10):
    gz = 27.5 + 3 * bay + 1.5
    for s in (1, 2):
        for nm in ('modular_fire_escape_platform_middle', 'modular_fire_escape_railing_middle'):
            p = lighter(KIT['E'].get(nm), 0.35)
            if p:
                fe.append((p, place(97.85, 4.15 + 3 * s, gz, face_for('A', 270))))
    st = lighter(KIT['E'].get('modular_fire_escape_stairs'), 0.3)
    if st:
        fe.append((st, place(97.85, 4.15 + 3 * 2, gz, face_for('A', 270))))
if fe:
    ob = merge('kilnyard_fire_escapes', fe)
    ob.data.calc_loop_triangles()
    n = len(ob.data.loop_triangles)
    xs = [v.co.x for v in ob.data.vertices]; zs = [-v.co.y for v in ob.data.vertices]
    print(f'{ob.name}: {len(fe)} pieces, {n} triangles -> budget {BUDGET["fire_escapes"]}; game x {min(xs):.2f}..{max(xs):.2f} z {min(zs):.2f}..{max(zs):.2f}')
    objs.append(ob)

# COLOUR ONLY, AT A BACKDROP'S SIZE: from 10–80 m a normal map or a roughness map is not seen, and each would be one more texture a phone
# holds. Each material keeps its base colour (and the windows their alpha); roughness and metal become constants; the big surfaces (brick,
# plaster, the windows) keep 512, the rest 256
ROUGH = {'brick': 0.88, 'plaster': 0.9, 'glass': 0.15, 'windows': 0.5, 'garage': 0.55, 'doors': 0.6, 'trim': 0.85, 'objects': 0.6, 'fire_escape': 0.6}
METAL = {'garage': 0.6, 'fire_escape': 0.7, 'windows': 0.2}
def kind(name):
    for k in ('glass', 'windows', 'brick_doors', 'garage', 'brick', 'plaster', 'trim', 'objects', 'fire_escape'):
        if k in name:
            return 'doors' if k == 'brick_doors' else k
    return 'trim'
used = set()
for ob in objs:
    for m in ob.data.materials:
        if not (m and m.use_nodes):
            continue
        k = kind(m.name)
        bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if bsdf is None:
            continue
        for sock in ('Normal', 'Roughness', 'Metallic'):
            for l in list(bsdf.inputs[sock].links):
                m.node_tree.links.remove(l)
        bsdf.inputs['Roughness'].default_value = ROUGH.get(k, 0.8)
        bsdf.inputs['Metallic'].default_value = METAL.get(k, 0.0)
        for sock in ('Base Color', 'Alpha'):
            for l in bsdf.inputs[sock].links:
                node = l.from_node
                while node and node.type != 'TEX_IMAGE' and node.inputs:
                    nxt = next((i.links[0].from_node for i in node.inputs if i.links), None)
                    node = nxt
                if node and node.type == 'TEX_IMAGE' and node.image:
                    used.add((node.image, 512 if k in ('brick', 'plaster', 'windows') else 256))
for im, size in used:
    if im.size[0] > size:
        im.scale(size, size)
used = {im for im, size in used}
print('images:', sorted(f'{im.name} {im.size[0]}x{im.size[1]}' for im in used))

# only the built objects are written
for o in bpy.context.scene.objects:
    o.select_set(False)
for ob in objs:
    ob.select_set(True)
bpy.context.view_layer.objects.active = objs[0]
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True, export_image_format='WEBP',
                          export_yup=True, export_texcoords=True, export_normals=True, export_materials='EXPORT')
total = 0
for ob in objs:
    ob.data.calc_loop_triangles()
    total += len(ob.data.loop_triangles)
print('EXPORTED', OUT, 'triangles', total)
