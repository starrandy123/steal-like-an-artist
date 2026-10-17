"""LOOK AT JUNO (10-16): the dressed pieces rendered in Blender — the whole of him front, three-quarters, side and back at 3 m, and his face at
0.6 m front, both three-quarters and both profiles — each piece in its part's colour from the game's palette (config.js SKATERS[0]),
Workbench with the studio light, cavity and shadow (a read of the SHAPES, not the game's own shading). Output: PNGs into --out.
Usage (a render: through heavy.sh): bash ~/.mosa/heavy.sh run <name> -- sh sources/juno/blender.sh work/juno_dressed.blend --python render.py -- --out work/renders"""
import bpy, sys, os, math
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
args = dict(zip(argv[0::2], argv[1::2])); OUT = args['--out']; os.makedirs(OUT, exist_ok=True)
scene = bpy.context.scene
PAL = {'skin': '#8a5a3c', 'lip': '#7a4434', 'jacket': '#a5502e', 'cuff': '#81402a', 'tee': '#efe6d2', 'pants': '#76824c', 'shoe': '#ece4d4', 'sole': '#b98b4e', 'beanie': '#d7a12c', 'hair': '#1d1612', 'eye': '#f2efe8'}
hexc = lambda h: tuple(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)) + (1.0,)
for m in bpy.data.materials:
    part = m.name.split(':')[-1] if m.name.startswith('part:') else None
    if part in PAL: m.diffuse_color = hexc(PAL[part])
for n in ('JunoEye.L', 'JunoEye.R'):
    o = bpy.data.objects.get(n)
    if o: m = bpy.data.materials.new('part:eye'); m.diffuse_color = hexc(PAL['eye']); o.data.materials.clear(); o.data.materials.append(m)
if bpy.data.objects.get('JunoBody'): bpy.data.objects['JunoBody'].hide_render = True
scene.render.engine = 'BLENDER_WORKBENCH'; sh = scene.display.shading
sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_cavity = True; sh.cavity_type = 'BOTH'; sh.show_shadows = True; sh.show_specular_highlight = True
scene.display.shadow_focus = 0.5
scene.render.resolution_x = 800; scene.render.resolution_y = 1000; scene.render.film_transparent = False
world = bpy.data.worlds.new('w'); world.color = (0.92, 0.9, 0.86); scene.world = world
cam_data = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_data); scene.collection.objects.link(cam); scene.camera = cam
def shot(name, at, look, lens):
    cam.location = Vector(at); d = Vector(look) - Vector(at); cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); cam_data.lens = lens
    scene.render.filepath = os.path.join(OUT, name + '.png'); bpy.ops.render.render(write_still=True)
# his front is −y in Blender (the game's nose is +z)
body = Vector((0, 0, 0.95)); face = Vector((0, -0.09, 1.62))
for name, az in (('front', 0), ('three_quarter_left', 40), ('side_left', 90), ('back', 180), ('three_quarter_right', -40)):
    a = math.radians(az); shot('body_' + name, (math.sin(a) * 3.0 * -1 if False else 3.0 * math.sin(a), -3.0 * math.cos(a), 1.0), body, 50)
for name, az in (('front', 0), ('three_quarter_left', 35), ('three_quarter_right', -35), ('profile_left', 90), ('profile_right', -90)):
    a = math.radians(az); shot('face_' + name, (face.x + 0.6 * math.sin(a), face.y - 0.6 * math.cos(a), face.z + 0.02), face, 85)
print('RENDERS: ' + ', '.join(sorted(os.listdir(OUT))))
