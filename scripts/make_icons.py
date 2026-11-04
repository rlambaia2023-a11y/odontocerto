"""Gera o ícone do sistema (favicon/PWA) em SVG e PNG. Rode: python scripts/make_icons.py"""
import pathlib
from PIL import Image, ImageDraw
root = pathlib.Path(__file__).resolve().parent.parent
out = root / 'src' / 'icons'; out.mkdir(exist_ok=True)

SVG = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b7ae0"/><stop offset="1" stop-color="#0a4796"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="url(#g)"/><path d="M27 12h10a3 3 0 0 1 3 3v9h9a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-9v9a3 3 0 0 1-3 3H27a3 3 0 0 1-3-3v-9h-9a3 3 0 0 1-3-3V27a3 3 0 0 1 3-3h9v-9a3 3 0 0 1 3-3z" fill="#fff"/><path d="M15 32h8.5l3-5.5 5 11 3.5-7.5 2 2H46" fill="none" stroke="#0b57b3" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="46" cy="32" r="2.6" fill="#e8603c"/></svg>'''
(out / 'icon.svg').write_text(SVG, encoding='utf-8')

def lerp(a, b, t): return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
def draw(size, maskable=False):
    S = 1024; k = S / 64
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    grad = Image.new('RGBA', (S, S))
    c0, c1 = (0x1b, 0x7a, 0xe0), (0x0a, 0x47, 0x96)
    gp = grad.load()
    for y in range(S):
        for x in range(0, S):
            gp[x, y] = lerp(c0, c1, (x + y) / (2 * S)) + (255,)
    mask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=0 if maskable else int(15 * k), fill=255)
    img.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(img)
    sc = 0.8 if maskable else 1.0  # área segura para ícone "maskable"
    T = lambda v: (v - 32) * sc * k + S / 2
    r = 3 * k * sc
    d.rounded_rectangle([T(24), T(12), T(40), T(52)], radius=r, fill='white')
    d.rounded_rectangle([T(12), T(24), T(52), T(40)], radius=r, fill='white')
    pts = [(15, 32), (23.5, 32), (26.5, 26.5), (31.5, 37.5), (35, 30), (37, 32), (46, 32)]
    pts = [(T(x), T(y)) for x, y in pts]
    w = int(3.2 * k * sc)
    d.line(pts, fill=(0x0b, 0x57, 0xb3), width=w, joint='curve')
    for p in (pts[0],):
        d.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=(0x0b, 0x57, 0xb3))
    cx, cy, cr = T(46), T(32), 2.6 * k * sc
    d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=(0xe8, 0x60, 0x3c))
    return img.resize((size, size), Image.LANCZOS)

draw(512).save(out / 'icon-512.png', optimize=True)
draw(192).save(out / 'icon-192.png', optimize=True)
draw(512, maskable=True).save(out / 'icon-maskable-512.png', optimize=True)
draw(180, maskable=True).convert('RGB').save(out / 'apple-touch-icon.png', optimize=True)
draw(32).save(out / 'favicon-32.png', optimize=True)
print('ícones gerados em', out)
