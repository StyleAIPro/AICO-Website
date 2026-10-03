"""Encode lightweight samples of the approved opening for network-independent motion."""
from pathlib import Path
from PIL import Image
import json,re,base64,io,hashlib
root=Path(__file__).resolve().parent.parent
source=root/'templates/cast-and-render/archive/aico-material-v6.1/index.html'
film=json.loads(re.search(r'var FILM = (\{[^\n]+\});',source.read_text())[1])
frames=[]
for index in range(0,len(film['frames']),4):
 raw=base64.b64decode(film['frames'][index]);im=Image.open(io.BytesIO(raw));im.thumbnail((480,270))
 out=io.BytesIO();im.save(out,format='WEBP',quality=55,method=6)
 frames.append({'index':index,'data':base64.b64encode(out.getvalue()).decode()})
preview={'step':4,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'frames':frames}
(root/'templates/cast-and-render/story/opening-preview.json').write_text(json.dumps(preview,separators=(',',':'))+'\n')
print('Preview frames:',len(frames),'compressed bytes:',sum(len(base64.b64decode(f['data'])) for f in frames))
