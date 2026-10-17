"""The jacket's and the tee's regions: their connected pieces (by shared edges) and the face sets in each — why a garment's sheet came out in
several pieces. Usage: sh sources/juno/blender.sh work/juno_fitted.blend --python region_pieces.py"""
import bpy, bmesh
from collections import defaultdict, Counter
o = bpy.data.objects['JunoBody']; me = o.data; FS = [me.attributes['.sculpt_face_set'].data[p.index].value for p in me.polygons]
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
zc = lambda f: sum(v.co.z for v in f.verts) / len(f.verts)
def pieces(keep, label):
    sel = {f.index for f in bm.faces if keep(f, FS[f.index])}; seen = set(); comps = []
    for i in sel:
        if i in seen: continue
        st = [i]; comp = []
        while st:
            k = st.pop()
            if k in seen: continue
            seen.add(k); comp.append(k)
            for e in bm.faces[k].edges:
                for g in e.link_faces:
                    if g.index in sel and g.index not in seen: st.append(g.index)
        comps.append(comp)
    print(label, len(comps), 'pieces:', ' | '.join('%d faces %s z %.2f..%.2f' % (len(c), dict(Counter(FS[k] for k in c)), min(zc(bm.faces[k]) for k in c), max(zc(bm.faces[k]) for k in c)) for c in sorted(comps, key=len, reverse=True)))
pieces(lambda f, s: s == 1 or (s == 19 and zc(f) > 1.075) or s in (20, 21, 11, 12), 'JACKET')
pieces(lambda f, s: s == 1 or (s == 19 and zc(f) > 1.005) or (s in (20, 21) and zc(f) > 1.36), 'TEE')
pieces(lambda f, s: s == 17 and zc(f) < 1.515 and sum(v.co.y for v in f.verts) / len(f.verts) > -0.05, 'COLLAR')
