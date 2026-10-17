"""THE PIPELINE SPIKE (10-16): the game's own skeleton into Blender, a test mesh bound to it, out as glTF — to prove, before any modelling hours,
that a model made in Blender binds to the game's EXISTING bones and moves with the game's own animation.

  sh sources/juno/blender.sh --python sources/juno/spike_bind.py -- \
      --skeleton sources/juno/skeleton.json --out sources/juno/spike/test_bind.glb [--auto 1]

The skeleton is the game's rest pose in the rig's space (x across, y up, z toward the nose; metres). Blender is Z-up with the front at -Y and
the glTF exporter writes Y-up (Blender (x, y, z) -> glTF (x, z, -y)), so a game point (x, y, z) is put at Blender (x, -z, y): exported, it lands
back on (x, y, z). The test mesh: one 4 cm box at the middle of every bone, its eight corners weighted 1.0 to that bone (a rigid follow the game
can check to the micron); with --auto 1, also a capsule over the body weighted by Blender's automatic weights (the real model's way), for the
weights' own sanity (each vertex's weights sum to 1, and its strongest bone is one near it)."""
import bpy, bmesh, json, sys, math

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
args = dict(zip(argv[0::2], argv[1::2]))
sk = json.load(open(args['--skeleton']))
out = args['--out']
auto = args.get('--auto', '0') == '1'

def G(v):
    return (v[0], -v[2], v[1])

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# the armature: one edit bone per game bone, head and tail where the game has them, parented as the game parents them (not connected: the
# game's children start where it says, not always at the parent's tail)
data = bpy.data.armatures.new('JunoRig')
arm = bpy.data.objects.new('JunoRig', data)
scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
eb = {}
for b in sk['bones']:
    e = data.edit_bones.new(b['name'])
    e.head = G(b['head'])
    e.tail = G(b['tail'])
    eb[b['name']] = e
for b in sk['bones']:
    if b['parent']:
        eb[b['name']].parent = eb[b['parent']]
        eb[b['name']].use_connect = False
bpy.ops.object.mode_set(mode='OBJECT')

# the rigid test: a box at each bone's middle, weighted 1.0 to it
mesh = bpy.data.meshes.new('JunoBoxes')
boxes = bpy.data.objects.new('JunoBoxes', mesh)
scene.collection.objects.link(boxes)
bm = bmesh.new()
owner = []
for b in sk['bones']:
    h, t = G(b['head']), G(b['tail'])
    mid = [(h[k] + t[k]) / 2 for k in range(3)]
    ret = bmesh.ops.create_cube(bm, size=0.04)
    for v in ret['verts']:
        v.co.x += mid[0]; v.co.y += mid[1]; v.co.z += mid[2]
        owner.append(b['name'])
bm.verts.index_update()
bm.to_mesh(mesh)
bm.free()
for b in sk['bones']:
    boxes.vertex_groups.new(name=b['name'])
for i, name in enumerate(owner):
    boxes.vertex_groups[name].add([i], 1.0, 'REPLACE')
boxes.parent = arm
mod = boxes.modifiers.new('Armature', 'ARMATURE')
mod.object = arm

if auto:
    # a capsule over the body (hips to head), weighted by Blender's own automatic (heat) weights, as the real model will be
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.16, depth=0.9, location=(0, 0, 1.25))
    cap = bpy.context.active_object
    cap.name = 'JunoCapsule'
    bpy.ops.object.modifier_add(type='SUBSURF')
    cap.modifiers[-1].levels = 1
    bpy.ops.object.modifier_apply(modifier=cap.modifiers[-1].name)
    bpy.ops.object.select_all(action='DESELECT')
    cap.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

bpy.ops.object.select_all(action='DESELECT')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_skins=True, export_animations=False)
print('SPIKE: ' + str(len(sk['bones'])) + ' bones, ' + str(len(owner)) + ' box corners' + (', a capsule on automatic weights' if auto else '') + ' -> ' + out)
