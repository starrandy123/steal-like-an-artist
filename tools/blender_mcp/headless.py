"""THE BLENDER MCP WITH NO WINDOW.

The official Blender MCP addon (addon.py beside this file: mcp-for-blender 2.1.9, MIT, sha256
eb0facf69781a30e69792532087d8d41c6a14fcd323353250abe7988ee297fa5, byte-identical to its GitHub source and to the PyPI wheel)
serves its socket only with a window open: its commands are drained by a UI timer, and in background mode (`blender -b`) it
refuses to start. This runner loads that same addon, unedited, in a background Blender, opens the addon's own server on its port,
and drains the addon's own queue from a main-thread loop. The official MCP server (`uvx mcp-for-blender@2.1.9`) drives it
unchanged, and nothing opens on the owner's screen.

Run through mcp_batch.sh, never by hand:
  blender -b --factory-startup --disable-autoexec --python headless.py -- --addon <addon.py> --port 9876 --stop <file> --idle 900
--disable-autoexec: a downloaded .blend may carry Python that runs on open; it never runs here.
--stop: the loop ends when this file appears. --idle: it ends after this many seconds without a command.
"""
import bpy
import importlib.util
import os
import socket
import sys
import threading
import time

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
opt = {args[i][2:]: args[i + 1] for i in range(0, len(args) - 1, 2) if args[i].startswith('--')}
addon_path, port, stop_file, idle = opt['addon'], int(opt.get('port', 9876)), opt.get('stop'), float(opt.get('idle', 900))

spec = importlib.util.spec_from_file_location('blendermcp_addon', addon_path)
addon = importlib.util.module_from_spec(spec)
sys.modules['blendermcp_addon'] = addon
spec.loader.exec_module(addon)
addon.register()   # its timers (the update check, the auto start) never fire: nothing here runs Blender's timer loop

scene = bpy.context.scene
scene.blendermcp_use_polyhaven = True   # CC0 models, textures and HDRIs: the one library this project takes from
for name in ('blendermcp_use_hyper3d', 'blendermcp_use_sketchfab', 'blendermcp_use_tripo', 'blendermcp_use_polypizza', 'blendermcp_use_hunyuan3d'):
    if hasattr(scene, name):
        setattr(scene, name, False)   # generators and mixed-licence catalogues stay off

server = addon.BlenderMCPServer(host='127.0.0.1', port=port)
server.running = True
server.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.socket.bind(('127.0.0.1', port))
server.socket.listen(5)
server.server_thread = threading.Thread(target=server._server_loop, daemon=True)
server.server_thread.start()
bpy.types.blendermcp_server = server
print(f'[headless] the Blender MCP addon is serving on 127.0.0.1:{port} (Blender {bpy.app.version_string})', flush=True)

last = time.time()
while server.running:
    pending = not server.command_queue.empty()
    server._drain_command_queue()
    if pending:
        last = time.time()
    if stop_file and os.path.exists(stop_file):
        print('[headless] stop file seen', flush=True)
        break
    if time.time() - last > idle:
        print(f'[headless] no command for {idle:.0f} s: stopping', flush=True)
        break
    time.sleep(0.02)
server.stop()
