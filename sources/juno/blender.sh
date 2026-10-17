#!/bin/sh
# EVERY BLENDER CALL FOR JUNO GOES THROUGH HERE: background, factory settings, and a downloaded .blend's own scripts never run
# (--disable-autoexec — a .blend can carry Python that runs on open). Usage: sh sources/juno/blender.sh [file.blend] --python <script> -- <args>
BL="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
exec "$BL" -b --factory-startup --disable-autoexec "$@"
