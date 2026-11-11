"""Hand-built depth map for the Studio 107 storefront photo (2122 x 1356).

The storefront is shot straight on, so it splits cleanly into depth planes:
roof, facade, protruding sign/pole/mailbox, and the interior seen through the glass.
White = near, black = far. Output is half resolution, softly blurred to avoid tearing.

Run: python3 tools/make_depth.py <storefront.png> public/media/storefront-depth.png
"""
import sys
from PIL import Image, ImageDraw, ImageFilter

W, H = 2122, 1356
src, out = sys.argv[1], sys.argv[2]
d = Image.new('L', (W, H), int(0.50 * 255))  # facade plane (stucco / brick)
g = ImageDraw.Draw(d)
v = lambda x: int(x * 255)

# Roof: recedes up and away from the camera.
for y in range(0, 200):
    g.line([(0, y), (W, y)], fill=v(0.28 + 0.17 * y / 200))
g.rectangle([0, 198, W, 297], fill=v(0.56))            # gutter / fascia band
# Interior seen through the glass (and the reflections in it, whose virtual image is far away).
g.rectangle([106, 622, 1365, H], fill=v(0.50))         # window frame
g.rectangle([128, 640, 1352, H], fill=v(0.16))         # window glass
g.rectangle([719, 640, 738, H], fill=v(0.50))          # mullion
g.rectangle([1393, 467, 1825, H], fill=v(0.52))        # door frame
g.rectangle([1407, 481, 1797, 630], fill=v(0.22))      # transom glass
g.rectangle([1422, 686, 1782, H], fill=v(0.18))        # door glass
# Things on / just behind the glass.
g.rectangle([340, 650, 585, 770], fill=v(0.30))        # neon OPEN sign
g.ellipse([380, 1010, 600, 1200], fill=v(0.36))        # plant leaves
g.rectangle([420, 1150, 545, 1295], fill=v(0.38))      # plant pot
g.ellipse([170, 1150, 285, 1260], fill=v(0.38))
g.rectangle([180, 1240, 275, 1337], fill=v(0.40))
g.polygon([(745, 1060), (930, 1040), (880, 1250), (790, 1250)], fill=v(0.36))
g.rectangle([810, 1240, 870, H], fill=v(0.38))
g.rectangle([1263, 1245, 1361, H], fill=v(0.46))       # hours card on the glass
g.rectangle([1422, 919, 1478, 976], fill=v(0.48))      # sticker on door glass
g.rectangle([1693, 1018, 1775, 1117], fill=v(0.48))    # notice on door glass
g.rectangle([1395, 1030, 1430, 1100], fill=v(0.56))    # door handle
# Protruding elements.
g.rectangle([54, 297, 1372, 622], fill=v(0.66))        # sign box
g.rectangle([1414, 262, 1556, 340], fill=v(0.62))      # light fixture
g.rectangle([1938, 1033, 2044, 1195], fill=v(0.62))    # mailbox
for i in range(22):                                    # barber pole: rounded cylinder
    t = i / 21
    shade = 0.72 + 0.10 * (1 - abs(t - 0.5) * 2)
    x = 1912 + int(t * 104)
    g.rectangle([x, 405, x + 5, 905], fill=v(shade))
g.ellipse([1915, 400, 2012, 500], fill=v(0.80))        # globe

d = d.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(5))
d.resize((W // 2, H // 2), Image.LANCZOS).save(out, optimize=True)
print('wrote', out)
