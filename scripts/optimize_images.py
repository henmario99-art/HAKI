"""Generate responsive, content-addressed WebP files without changing originals."""
import json, hashlib, io, re
from pathlib import Path
from urllib.request import urlopen
from PIL import Image, ImageOps
root=Path(__file__).resolve().parents[1]
out=root/'images/optimized';out.mkdir(exist_ok=True)
manifest={};before=after=0
sources={str(p.relative_to(root)):p.read_bytes() for p in (root/'images').iterdir() if p.suffix.lower() in ['.jpg','.jpeg','.png','.webp']}
source=(root/'productos.js').read_text();hero=json.loads(re.search(r'window.HAKI_CONFIG = (.*?);\s*\n\s*window.HAKI_PRODUCTOS',source,re.S)[1])['portada']
try: sources[hero]=urlopen(hero,timeout=20).read()
except Exception as e: print('Hero download:',e)
for name,data in sources.items():
 im=ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert('RGB');key=hashlib.sha256(data).hexdigest()[:12];variants=[]
 for width in ([640,1280,1920] if name==hero else [400,800,1400]):
  copy=im.copy();copy.thumbnail((width,round(width*im.height/im.width)),Image.Resampling.LANCZOS)
  path=out/f'{key}-{copy.width}.webp';copy.save(path,'WEBP',quality=80,method=6)
  variants.append({'src':str(path.relative_to(root)),'width':copy.width})
 manifest[name]=list({v['width']:v for v in variants}.values());before+=len(data);after+=(root/variants[0]['src']).stat().st_size
(root/'image-manifest.js').write_text('window.HAKI_IMAGES = '+json.dumps(manifest,separators=(',',':'))+';\n')
print(json.dumps({'images':len(sources),'original_bytes':before,'small_versions_bytes':after,'reduction_percent':round(100*(1-after/before))}))
