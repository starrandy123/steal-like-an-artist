# TAG WHAT WAS JUST IMPORTED: every mesh object not yet tagged gets the prop kind it belongs to (KIND, set by the batch)
import bpy
n = 0
for o in bpy.data.objects:
    if o.type == 'MESH' and 'kind' not in o.keys():
        o['kind'] = KIND
        n += 1
print(KIND, 'tagged', n, 'objects')
