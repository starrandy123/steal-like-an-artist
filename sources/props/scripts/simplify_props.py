# A PROP A BOARD CAN REACH THE TOP OF, MADE A SIMPLE SHAPE (10-17; the supervisor's pre-ruling via orgo-u-62: a reachable prop top deeper than
# 2 cm under the support sweep takes the cheapest option that keeps drawn = collided, a SIMPLER MESH). The crate is a box, the tyre a plain
# ring (laid flat) and the barrel a plain drum. Each is fitted to the whole model's measured extent (`hi_<kind>`, kept whole by
# scripts/build_props.py), with a FLAT top: the board seats on a plane, and there is no crease to straddle. 32 faces round a drum or a ring
# leave 11.25 degrees between neighbours, under the sweep's 15-degree edge. The model's look is kept in its texture: the whole model's base
# colour and the shading of its own crevices (ambient occlusion) are baked onto the simple one (Cycles, selected to active), then multiplied
# by an emission bake on the simple shape itself. One stage a call, each well inside the MCP's 180 s, and only what its safe mode allows
# (no os, no numpy, no lambda): STAGE 'shape' (the mesh, its UVs, its material) · 'color' · 'ao' · 'final' (the multiply, saved to RUN).
# The batch sets KIND, STAGE and RUN.
import bpy
import bmesh
import math

SIZE = 512        # px, one texture a kind
N = 32            # faces round a drum or a ring
AO_DIST = 0.1     # m: how far a crevice's shading reaches
AO_FLOOR = 0.25   # the darkest a crevice makes the colour: colour x (0.25 + 0.75 x AO)
SHAPES = {'crate': 'box', 'tyre': 'ring', 'barrel': 'drum'}

scene = bpy.context.scene
hi = bpy.data.objects['hi_' + KIND]


def only(keep):
    # the bake sees these objects and nothing else (every prop is built at the origin: the others would stand inside this one)
    for o in bpy.data.objects:
        o.hide_render = o not in keep
        o.select_set(False)


def node(nt, kind):
    return next(n for n in nt.nodes if n.type == kind)


def image_node(nt, name):
    return next(n for n in nt.nodes if n.type == 'TEX_IMAGE' and n.name == name)


def build_shape():
    V = [hi.matrix_world @ v.co for v in hi.data.vertices]
    x0, x1 = min(v.x for v in V), max(v.x for v in V)
    y0, y1 = min(v.y for v in V), max(v.y for v in V)
    H = max(v.z for v in V)               # the foot is at 0 (build_props)
    R = max(math.hypot(v.x, v.y) for v in V)
    pts, faces = [], []                    # faces: (vertex indices, island, {vertex index: (a, b) metres in the island})
    shape = SHAPES[KIND]
    if shape == 'box':
        pts = [(x0, y0, 0.0), (x1, y0, 0.0), (x1, y1, 0.0), (x0, y1, 0.0), (x0, y0, H), (x1, y0, H), (x1, y1, H), (x0, y1, H)]
        for idx, island, ax in (([4, 5, 6, 7], 'top', (0, 1)), ([3, 2, 1, 0], 'bottom', (0, 1)), ([0, 1, 5, 4], 'front', (0, 2)),
                                ([2, 3, 7, 6], 'back', (0, 2)), ([1, 2, 6, 5], 'right', (1, 2)), ([3, 0, 4, 7], 'left', (1, 2))):
            faces.append((idx, island, {i: (pts[i][ax[0]], pts[i][ax[1]]) for i in idx}))   # ax: the two coordinates that span the face
        dims = f'{x1 - x0:.3f} x {y1 - y0:.3f} x {H:.3f} m'
    else:
        ring = shape == 'ring'
        r = min(math.hypot(v.x, v.y) for v in V) if ring else 0.0   # the tyre's hole: its innermost vertex
        ang = [2 * math.pi * k / N for k in range(N)]
        for z in (0.0, H):                 # 0..N-1 outer bottom, N..2N-1 outer top
            for k in range(N):
                pts.append((R * math.cos(ang[k]), R * math.sin(ang[k]), z))
        if ring:                           # 2N..3N-1 inner bottom, 3N..4N-1 inner top
            for z in (0.0, H):
                for k in range(N):
                    pts.append((r * math.cos(ang[k]), r * math.sin(ang[k]), z))
        else:                              # 2N the bottom's middle, 2N+1 the top's
            pts.append((0.0, 0.0, 0.0))
            pts.append((0.0, 0.0, H))
        half = N // 2
        for k in range(N):                 # the outer wall in two strips (u: the arc from the strip's start, v: the height)
            k1 = (k + 1) % N
            s, j = divmod(k, half)
            u0, u1 = R * 2 * math.pi * j / N, R * 2 * math.pi * (j + 1) / N
            faces.append(([k, k1, N + k1, N + k], 'side%d' % s, {k: (u0, 0.0), k1: (u1, 0.0), N + k1: (u1, H), N + k: (u0, H)}))
        for k in range(N):
            k1 = (k + 1) % N
            if ring:
                u0, u1 = r * 2 * math.pi * k / N, r * 2 * math.pi * (k + 1) / N
                faces.append(([2 * N + k1, 2 * N + k, 3 * N + k, 3 * N + k1], 'inner',
                              {2 * N + k1: (u1, 0.0), 2 * N + k: (u0, 0.0), 3 * N + k: (u0, H), 3 * N + k1: (u1, H)}))
                top = [N + k, N + k1, 3 * N + k1, 3 * N + k]
                bot = [k1, k, 2 * N + k, 2 * N + k1]
            else:
                top = [N + k, N + k1, 2 * N + 1]
                bot = [k1, k, 2 * N]
            faces.append((top, 'top', {i: (pts[i][0] + R, pts[i][1] + R) for i in top}))
            faces.append((bot, 'bottom', {i: (pts[i][0] + R, pts[i][1] + R) for i in bot}))
        dims = f'R {R:.3f}' + (f' r {r:.3f}' if ring else '') + f' H {H:.3f} m'
    bm = bmesh.new()
    bv = [bm.verts.new(p) for p in pts]
    bm.verts.index_update()   # a new vertex's index is -1 until it is numbered (its number is its place in `pts`)
    bm.verts.ensure_lookup_table()
    made = [bm.faces.new([bv[i] for i in f[0]]) for f in faces]
    bm.normal_update()
    if bm.calc_volume(signed=True) < 0:   # every face looks out of the solid
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
        bm.normal_update()
    # THE UVs: each island's own metres, shelf-packed into the square at one scale (the bottom, never seen, a quarter of its size)
    shrink = {'bottom': 0.25}
    ext = {}
    for f in faces:
        isl, loc = f[1], f[2]
        if isl not in ext:
            ext[isl] = [1e9, 1e9, -1e9, -1e9]
        e = ext[isl]
        for p in loc.values():
            e[0] = min(e[0], p[0]); e[1] = min(e[1], p[1]); e[2] = max(e[2], p[0]); e[3] = max(e[3], p[1])
    size = {}
    for k in ext:
        e = ext[k]
        size[k] = ((e[2] - e[0]) * shrink.get(k, 1), (e[3] - e[1]) * shrink.get(k, 1))
    gap = 0.03

    def tallest_first(k):
        return -size[k][1]
    order = sorted(size, key=tallest_first)
    area = sum(w * h for w, h in size.values())
    width = max(max(w for w, h in size.values()), math.sqrt(area) * 1.2)
    at, x, y, row_h = {}, 0.0, 0.0, 0.0
    for k in order:
        w, h = size[k]
        if x > 0 and x + w > width:
            x, y, row_h = 0.0, y + row_h + gap, 0.0
        at[k] = (x, y)
        x += w + gap
        row_h = max(row_h, h)
    side = max(width, y + row_h)
    m = 4.0 / SIZE
    sc = (1 - 2 * m) / side
    uv = bm.loops.layers.uv.new('UVMap')
    for f, spec in zip(made, faces):
        isl, loc = spec[1], spec[2]
        e, k = ext[isl], shrink.get(isl, 1)
        for lp in f.loops:
            a, b = loc[lp.vert.index]
            lp[uv].uv = (m + sc * (at[isl][0] + (a - e[0]) * k), m + sc * (at[isl][1] + (b - e[1]) * k))
    me = bpy.data.meshes.new('prop_' + KIND)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:                  # round walls shade round, the caps and the box flat
        p.use_smooth = shape != 'box' and abs(p.normal.z) < 0.5
    ob = bpy.data.objects.new('prop_' + KIND, me)
    scene.collection.objects.link(ob)
    # it must not shade the model it is baked from (it stands round it)
    ob.visible_diffuse = False
    ob.visible_glossy = False
    ob.visible_transmission = False
    ob.visible_volume_scatter = False
    ob.visible_shadow = False
    mat = bpy.data.materials.new('prop_' + KIND)
    try:
        mat.use_nodes = True   # (always on from Blender 5; set for older)
    except Exception:
        pass
    nt = mat.node_tree
    bsdf = node(nt, 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = 0.7
    bsdf.inputs['Metallic'].default_value = 0.3 if KIND == 'barrel' else 0.0
    for name in ('color', 'ao', 'final'):
        t = nt.nodes.new('ShaderNodeTexImage')
        t.name = name
        t.image = bpy.data.images.new('prop_%s_%s' % (KIND, name), SIZE, SIZE, alpha=False)
        if name == 'ao':
            t.image.colorspace_settings.name = 'Non-Color'
    me.materials.append(mat)
    me.calc_loop_triangles()
    print(f'{KIND}: a {shape}, {dims}; {len(me.polygons)} faces, {len(me.loop_triangles)} triangles; islands {sorted(size)}; texel {sc * SIZE:.0f} px a metre')


def mean_of(img):
    px = img.pixels[:]
    n = len(px) // 4
    return sum(px[i] for i in range(0, len(px), 4 * 37)) / len(range(0, len(px), 4 * 37)) if n else 0.0


def bake(kind_of_bake):
    lo = bpy.data.objects['prop_' + KIND]
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    nt = lo.data.materials[0].node_tree
    if kind_of_bake == 'EMIT':
        only([lo])
    else:
        only([hi, lo])
        hi.select_set(True)
    lo.select_set(True)
    bpy.context.view_layer.objects.active = lo
    if kind_of_bake == 'AO':
        if scene.world is None:
            scene.world = bpy.data.worlds.new('bake_world')
        scene.world.light_settings.distance = AO_DIST
        scene.cycles.samples = 64
        target = image_node(nt, 'ao')
    elif kind_of_bake == 'DIFFUSE':
        scene.cycles.samples = 4
        target = image_node(nt, 'color')
    else:
        # the multiply, on the simple shape itself: its emission is colour x (AO_FLOOR + (1 - AO_FLOOR) x AO), baked as it is
        scene.cycles.samples = 1
        out = node(nt, 'OUTPUT_MATERIAL')
        shade = nt.nodes.new('ShaderNodeMath')
        shade.operation = 'MULTIPLY_ADD'
        nt.links.new(image_node(nt, 'ao').outputs['Color'], shade.inputs[0])
        shade.inputs[1].default_value = 1 - AO_FLOOR
        shade.inputs[2].default_value = AO_FLOOR
        scale = nt.nodes.new('ShaderNodeVectorMath')
        scale.operation = 'SCALE'
        nt.links.new(image_node(nt, 'color').outputs['Color'], scale.inputs[0])
        nt.links.new(shade.outputs['Value'], scale.inputs['Scale'])
        glow = nt.nodes.new('ShaderNodeEmission')
        glow.inputs['Strength'].default_value = 1.0
        nt.links.new(scale.outputs['Vector'], glow.inputs['Color'])
        nt.links.new(glow.outputs['Emission'], out.inputs['Surface'])
        target = image_node(nt, 'final')
    nt.nodes.active = target
    bpy.ops.object.bake(type=kind_of_bake, pass_filter={'COLOR'} if kind_of_bake == 'DIFFUSE' else set(),
                        use_selected_to_active=kind_of_bake != 'EMIT', cage_extrusion=0.03, margin=8, use_clear=True, target='IMAGE_TEXTURES')
    print(f'{KIND}: {kind_of_bake} baked into {target.image.name}, mean {mean_of(target.image):.2f}')
    if kind_of_bake == 'EMIT':
        # the material the game gets: the principled surface, its colour the baked one; the bake's own nodes go
        nt.links.new(node(nt, 'BSDF_PRINCIPLED').outputs['BSDF'], out.inputs['Surface'])
        nt.links.new(target.outputs['Color'], node(nt, 'BSDF_PRINCIPLED').inputs['Base Color'])
        for n in (shade, scale, glow, image_node(nt, 'color'), image_node(nt, 'ao')):
            nt.nodes.remove(n)
        target.image.filepath_raw = RUN + '/prop_' + KIND + '.png'
        target.image.file_format = 'PNG'
        target.image.save()
        print(f'{KIND}: saved {target.image.filepath_raw}')


if STAGE == 'shape':
    build_shape()
elif STAGE == 'color':
    bake('DIFFUSE')
elif STAGE == 'ao':
    bake('AO')
elif STAGE == 'final':
    bake('EMIT')
