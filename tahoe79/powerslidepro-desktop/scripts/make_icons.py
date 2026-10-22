#!/usr/bin/env python3
"""Generate Windows ICO, macOS ICNS and PNG from the user-supplied blue P icon."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'brand' / 'icon-source.png'
BUILD = ROOT / 'build'
BUILD.mkdir(parents=True, exist_ok=True)
if not SOURCE.is_file():
    raise SystemExit('Missing PowerSlidePro branding image')

logo = Image.open(SOURCE).convert('RGBA')
if logo.width != logo.height:
    side = max(logo.size)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.alpha_composite(logo, ((side-logo.width)//2, (side-logo.height)//2))
    logo = canvas
def square(size):
    return logo.resize((size, size), Image.Resampling.LANCZOS)
square(512).save(BUILD / 'icon.png', optimize=True)
square(256).save(BUILD / 'icon.ico', format='ICO', sizes=[
    (16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
square(1024).save(BUILD / 'icon.icns', format='ICNS')
# Dedicated document icon: the user's blue 3D cross + slide artwork.
# Keep it separate from the PowerSlidePro application icon.
DOCUMENT_SOURCE = ROOT / 'brand' / 'deckcraft-file-source.png'
if not DOCUMENT_SOURCE.is_file():
    raise SystemExit('Missing .deckcraft file-type artwork')
document = Image.open(DOCUMENT_SOURCE).convert('RGBA')
document.resize((256, 256), Image.Resampling.LANCZOS).save(
    BUILD / 'deckcraft.ico', format='ICO',
    sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)]
)
for name in ('icon.png','icon.ico','icon.icns','deckcraft.ico'):
    path = BUILD / name
    if not path.exists() or path.stat().st_size < 100:
        raise SystemExit('Icon generation failed: ' + name)
    print(name, path.stat().st_size, 'bytes')
