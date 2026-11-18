import json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent.parent
mapping={}; saved=0
for p in (root/'assets').rglob('*.png'):
 try:
  im=Image.open(p)
  if getattr(im,'n_frames',1)>1: continue
  out=p.with_name(p.stem+'.lossless.webp')
  im.save(out,'WEBP',lossless=True,method=6,exact=True)
  if out.stat().st_size < p.stat().st_size*.95:
   mapping[p.relative_to(root).as_posix()]=out.relative_to(root).as_posix(); saved+=p.stat().st_size-out.stat().st_size
  else: out.unlink()
 except Exception as e: print(p,e)
p=root/'content.json'; data=json.loads(p.read_text())
def replace(v):
 if isinstance(v,dict): return {k:replace(x) for k,x in v.items()}
 if isinstance(v,list): return [replace(x) for x in v]
 if isinstance(v,str):
  base,sep,query=v.partition('?')
  return mapping.get(base,base)+(sep+query if sep else '')
 return v
p.write_text(json.dumps(replace(data),ensure_ascii=False,indent=2)+'\n')
print('converted',len(mapping),'saved MiB',round(saved/1048576,1))
