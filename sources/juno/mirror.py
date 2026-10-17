"""THE FACE'S MIRROR (10-16): every point of the head and the face against the SURFACE across the midline — the mirror of each vertex,
(−x, y, z), and its distance to the nearest point of the mesh (two sides' vertices need not pair: the base's own vertices are not all mirrored
pairs) — the largest, read twice: the face in front of the ears (|x| < 7.5 cm, in front of y −4 cm, above z 1.53), and the whole head above
the neck; and the eyes' centres against each other's mirror. The supervisor's bound: the face within 0.1 mm.
Usage: sh sources/juno/blender.sh work/juno_dressed.blend --python mirror.py"""
import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree
for name in ('JunoBody', 'JunoSkin'):
    o = bpy.data.objects.get(name)
    if not o: continue
    from mathutils.bvhtree import BVHTree
    bvh = BVHTree.FromPolygons([v.co for v in o.data.vertices], [list(p.vertices) for p in o.data.polygons])
    for label, pick in (('the face (in front of the ears)', lambda c: c.z > 1.53 and c.y < -0.04 and abs(c.x) < 0.075), ('the head and face', lambda c: c.z > 1.53)):
        V = [v.co.copy() for v in o.data.vertices if pick(v.co)]
        worst = 0; at = None
        for p in V:
            hit = bvh.find_nearest(Vector((-p.x, p.y, p.z)))   # the mirror of each point, against the SURFACE (two sides' vertices need not pair)
            if hit[0] is not None and hit[3] > worst: worst, at = hit[3], p
        print("MIRROR %s, %s: %d points, each one's mirror at most %.4f mm off the surface (at %.3f, %.3f, %.3f)" % (name, label, len(V), worst * 1000, at.x, at.y, at.z))
eL, eR = bpy.data.objects.get('JunoEye.L'), bpy.data.objects.get('JunoEye.R')
if eL and eR:
    cL = sum((v.co for v in eL.data.vertices), Vector()) / len(eL.data.vertices); cR = sum((v.co for v in eR.data.vertices), Vector()) / len(eR.data.vertices)
    print("EYES: centres %s and %s · the left against the right's mirror %.4f mm" % (tuple(round(c, 4) for c in cL), tuple(round(c, 4) for c in cR), (cL - Vector((-cR.x, cR.y, cR.z))).length * 1000))
