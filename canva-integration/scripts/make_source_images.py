#!/usr/bin/env python3
"""Generate 3 clean dhaniya (coriander) powder product-label images (1080x1080).

These are used as source assets for the Canva pipeline (upload -> design -> export).
No external photos are used, so there are no licensing concerns.
"""
import math
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "assets")
NOTO = "/usr/share/fonts/google-noto-vf/NotoSans[wght].ttf"

SIZE = 1080

# Three variants: (key, net weight, tagline, palette)
VARIANTS = [
    {
        "key": "dhaniya-1",
        "weight": "100 g",
        "tagline": "Freshly ground coriander",
        "bg": (244, 236, 219),
        "band": (84, 110, 57),
        "accent": (170, 138, 58),
        "ink": (45, 43, 35),
    },
    {
        "key": "dhaniya-2",
        "weight": "200 g",
        "tagline": "Aromatic & pure",
        "bg": (238, 228, 206),
        "band": (122, 88, 46),
        "accent": (140, 158, 78),
        "ink": (48, 38, 28),
    },
    {
        "key": "dhaniya-3",
        "weight": "500 g",
        "tagline": "Value family pack",
        "bg": (235, 240, 224),
        "band": (60, 96, 74),
        "accent": (193, 142, 50),
        "ink": (38, 46, 38),
    },
]


def font(weight, px):
    f = ImageFont.truetype(NOTO, px)
    try:
        f.set_variation_by_axes([weight])
    except Exception:
        pass
    return f


def center_text(draw, cx, y, text, fnt, fill):
    box = draw.textbbox((0, 0), text, font=fnt)
    w = box[2] - box[0]
    draw.text((cx - w / 2, y), text, font=fnt, fill=fill)
    return box[3] - box[1]


def draw_coriander_motif(draw, cx, cy, r, seed_color, ring_color):
    """A simple stylised pile of coriander seeds inside a ring."""
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=ring_color, width=10)
    # scatter little seeds
    import random
    random.seed(7)
    for _ in range(90):
        ang = random.uniform(0, 2 * math.pi)
        rad = random.uniform(0, r - 36) * math.sqrt(random.random())
        x = cx + rad * math.cos(ang)
        y = cy + rad * math.sin(ang) * 0.62 + r * 0.22
        sr = random.uniform(7, 13)
        draw.ellipse([x - sr, y - sr, x + sr, y + sr], fill=seed_color)
        draw.arc([x - sr, y - sr, x + sr, y + sr], 200, 340,
                 fill=(255, 255, 255, 120), width=2)


def make(v):
    img = Image.new("RGB", (SIZE, SIZE), v["bg"])
    d = ImageDraw.Draw(img, "RGBA")

    # Outer frame
    d.rectangle([28, 28, SIZE - 28, SIZE - 28], outline=v["accent"], width=4)

    # Top brand band
    d.rectangle([28, 28, SIZE - 28, 150], fill=v["band"])
    center_text(d, SIZE / 2, 64, "S P I C E S", font(700, 46), (250, 246, 236))

    # Coriander motif
    draw_coriander_motif(d, SIZE / 2, 430, 220,
                         seed_color=v["accent"], ring_color=v["band"])

    # Product name
    center_text(d, SIZE / 2, 700, "Dhaniya Powder", font(800, 96), v["ink"])
    center_text(d, SIZE / 2, 812, "Ground Coriander", font(500, 44), v["band"])

    # Tagline
    center_text(d, SIZE / 2, 884, v["tagline"], font(400, 38), v["ink"])

    # Net weight pill
    pill_w, pill_h = 300, 86
    px0 = (SIZE - pill_w) / 2
    py0 = 952
    d.rounded_rectangle([px0, py0, px0 + pill_w, py0 + pill_h], radius=43,
                        fill=v["accent"])
    center_text(d, SIZE / 2, py0 + 20, f"NET WT {v['weight']}", font(700, 40),
                (255, 252, 245))

    os.makedirs(ASSETS, exist_ok=True)
    out = os.path.join(ASSETS, f"{v['key']}.png")
    img.save(out, "PNG")
    print("wrote", os.path.relpath(out, os.path.join(HERE, "..")))


if __name__ == "__main__":
    for v in VARIANTS:
        make(v)
