"""Gera o ícone do sistema (favicon/PWA) em SVG e PNG. Rode: python scripts/make_icons.py

Símbolo: bastão de Asclépio (símbolo da medicina) em branco sobre o azul da marca.
"""
import math
import pathlib
from PIL import Image, ImageDraw
root = pathlib.Path(__file__).resolve().parent.parent
out = root / 'src' / 'icons'; out.mkdir(exist_ok=True)

# Desenho no espaço 64x64 (o mesmo do SVG)
STAFF = ((32, 9.5), (32, 54.5)); STAFF_W = 5; STAFF_C = (0xa9, 0xcd, 0xf5)
SNAKE = [  # curvas cúbicas (início, controle 1, controle 2, fim)
    ((38.5, 20), (46, 21), (45, 27.5), (32, 28.5)),
    ((32, 28.5), (19, 29.5), (18.5, 36), (32, 37.5)),
    ((32, 37.5), (45.5, 39), (45.5, 44.5), (32, 46)),
    ((32, 46), (18.5, 47.5), (27, 51.5), (31, 53)),
]
SNAKE_W = 4.6
HEAD = (37.5, 19.4, 4.6, 3.1, -14)  # cx, cy, rx, ry, rotação (graus)
EYE = (36.6, 18.6, 1.05)

SVG = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
       '<stop offset="0" stop-color="#1b7ae0"/><stop offset="1" stop-color="#0a4796"/></linearGradient></defs>'
       '<rect width="64" height="64" rx="15" fill="url(#g)"/>'
       '<path d="M32 9.5v45" stroke="#a9cdf5" stroke-width="5" stroke-linecap="round"/>'
       '<path d="M38.5 20C46 21 45 27.5 32 28.5S18.5 36 32 37.5S45.5 44.5 32 46S27 51.5 31 53" fill="none" stroke="#fff" '
       'stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>'
       '<ellipse cx="37.5" cy="19.4" rx="4.6" ry="3.1" fill="#fff" transform="rotate(-14 37.5 19.4)"/>'
       '<circle cx="36.6" cy="18.6" r="1.05" fill="#e8603c"/></svg>')
(out / 'icon.svg').write_text(SVG, encoding='utf-8')


def lerp(a, b, t): return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def bezier(p0, p1, p2, p3, n=80):
    for i in range(n + 1):
        t = i / n; u = 1 - t
        yield (u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
               u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1])


def draw(size, maskable=False):
    S = 1024; k = S / 64
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    grad = Image.new('RGBA', (S, S))
    c0, c1 = (0x1b, 0x7a, 0xe0), (0x0a, 0x47, 0x96)
    gp = grad.load()
    for y in range(S):
        for x in range(S):
            gp[x, y] = lerp(c0, c1, (x + y) / (2 * S)) + (255,)
    mask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=0 if maskable else int(15 * k), fill=255)
    img.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(img)
    sc = 0.8 if maskable else 1.0  # área segura para ícone "maskable"
    T = lambda x, y: ((x - 32) * sc * k + S / 2, (y - 32) * sc * k + S / 2)

    def stroke(points, w, color):
        r = w * sc * k / 2
        for x, y in points:
            cx, cy = T(x, y)
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)

    (sx, sy0), (_, sy1) = STAFF
    stroke([(sx, sy0 + (sy1 - sy0) * i / 200) for i in range(201)], STAFF_W, STAFF_C)
    for seg in SNAKE:
        stroke(list(bezier(*seg)), SNAKE_W, 'white')
    cx, cy, rx, ry, rot = HEAD; a = math.radians(rot)
    d.polygon([T(cx + rx * math.cos(t) * math.cos(a) - ry * math.sin(t) * math.sin(a),
                 cy + rx * math.cos(t) * math.sin(a) + ry * math.sin(t) * math.cos(a))
               for t in (2 * math.pi * i / 120 for i in range(120))], fill='white')
    ex, ey, er = EYE; (px, py), rr = T(ex, ey), er * sc * k
    d.ellipse([px - rr, py - rr, px + rr, py + rr], fill=(0xe8, 0x60, 0x3c))
    return img.resize((size, size), Image.LANCZOS)


draw(512).save(out / 'icon-512.png', optimize=True)
draw(192).save(out / 'icon-192.png', optimize=True)
draw(512, maskable=True).save(out / 'icon-maskable-512.png', optimize=True)
draw(180, maskable=True).convert('RGB').save(out / 'apple-touch-icon.png', optimize=True)
draw(32).save(out / 'favicon-32.png', optimize=True)
print('ícones gerados em', out)
