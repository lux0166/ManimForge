import sys, base64, os
path = sys.argv[1]
dirname = os.path.dirname(path)
if dirname:
    os.makedirs(dirname, exist_ok=True)
with open(path, 'wb') as f:
    f.write(base64.b64decode(sys.argv[2]))
print('Written', path)
