"""The male bodies' vertex groups, UV maps, shape keys, face sets and attributes (nothing in the file run).
Usage: sh sources/juno/blender.sh <the bundle .blend> --python inspect_base3.py   (-b --factory-startup --disable-autoexec)"""
import bpy
for name in ['GEO-body_male_realistic', 'GEO-body_male_stylized']:
    o = bpy.data.objects[name]; me = o.data
    print(name, 'groups', [g.name for g in o.vertex_groups][:60], 'uv', [u.name for u in me.uv_layers], 'shapekeys', [k.name for k in me.shape_keys.key_blocks] if me.shape_keys else None)
    print('  attributes', [(a.name, a.domain, a.data_type) for a in me.attributes][:30])
    # open edges (boundaries) and the manifold check at the base level
    import bmesh
    bm = bmesh.new(); bm.from_mesh(me)
    bnd = [e for e in bm.edges if e.is_boundary]; nm = [e for e in bm.edges if not e.is_manifold and not e.is_boundary]
    # the boundary loops: their sizes and centres
    loops = []; seen = set()
    for e in bnd:
        if e in seen: continue
        stack = [e]; comp = []
        while stack:
            x = stack.pop()
            if x in seen: continue
            seen.add(x); comp.append(x)
            for v in x.verts:
                for y in v.link_edges:
                    if y.is_boundary and y not in seen: stack.append(y)
        vs = {v for x in comp for v in x.verts}; c = sum((v.co for v in vs), vs.pop().co.copy() * 0) if False else None
        cx = sum(v.co.x for x in comp for v in x.verts) / (2 * len(comp)); cz = sum(v.co.z for x in comp for v in x.verts) / (2 * len(comp)); cy = sum(v.co.y for x in comp for v in x.verts) / (2 * len(comp))
        loops.append((len(comp), round(cx, 3), round(cy, 3), round(cz, 3)))
    print('  boundary edges', len(bnd), 'non-manifold', len(nm), 'loops (edges, x, y, z):', sorted(loops, key=lambda l: -l[0])[:12])
    # pieces
    seenv = set(); pieces = 0
    for v in bm.verts:
        if v in seenv: continue
        pieces += 1; st = [v]
        while st:
            u = st.pop()
            if u in seenv: continue
            seenv.add(u)
            for e in u.link_edges: st.append(e.other_vert(u))
    print('  pieces', pieces, 'euler V-E+F', len(bm.verts) - len(bm.edges) + len(bm.faces))
    bm.free()
