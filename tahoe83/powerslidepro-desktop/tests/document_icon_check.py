import sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
p=root/"build"/"deckcraft-orange-2026.ico"
img=Image.open(p).convert("RGBA")
assert img.size == (256,256),img.size
px=list(img.getdata())
opaque=[(r,g,b,a) for r,g,b,a in px if a>64]
assert opaque,"document icon has no visible pixels"
warm=sum(r>g*1.3 and r>b*1.6 for r,g,b,a in opaque)
assert warm/len(opaque)>0.22,(warm,len(opaque))
app=Image.open(root/"build"/"icon.ico").convert("RGBA")
assert app.size == (256,256)
print("Confirmed orange document icon distinct from application icon:",p.name,"warm fraction",round(warm/len(opaque),3))
