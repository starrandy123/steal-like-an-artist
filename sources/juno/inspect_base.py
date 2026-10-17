"""Lists what a downloaded .blend holds — its objects, their kinds, vertices, faces, triangles, dimensions, modifiers, materials — without
running anything in it (opened with --disable-autoexec). Usage: sh sources/juno/blender.sh <file.blend> --python inspect_base.py   (-b --factory-startup --disable-autoexec)"""
import bpy
for o in sorted(bpy.data.objects, key=lambda o: o.name):
    line = o.name + ' [' + o.type + ']'
    if o.type == 'MESH':
        me = o.data
        tris = sum(len(p.vertices) - 2 for p in me.polygons)
        d = o.dimensions
        line += ' v %d f %d tris %d · %.3f × %.3f × %.3f m · mods %s · mats %s · parent %s · coll %s' % (len(me.vertices), len(me.polygons), tris, d.x, d.y, d.z, [m.type for m in o.modifiers], [m.name for m in me.materials if m], o.parent.name if o.parent else '-', [c.name for c in o.users_collection])
    print('OBJ ' + line)
print('TEXTS', [t.name for t in bpy.data.texts])
print('SCENES', [s.name for s in bpy.data.scenes])
