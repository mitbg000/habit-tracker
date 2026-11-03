#!/usr/bin/env python3
# Tạo icon PNG của web app từ logo Nhịp (cùng hình với client/public/favicon.svg). Cần Pillow.
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / 'client' / 'public'
BARS = [(8, 16, 3.5, 8), (14.25, 11, 3.5, 13), (20.5, 8, 3.5, 16)]  # x, y, rộng, cao trên lưới 32

for name, size in [('apple-touch-icon.png', 180), ('icon-192.png', 192), ('icon-512.png', 512)]:
    scale = size * 4 / 32  # vẽ to gấp 4 rồi thu nhỏ cho mịn cạnh
    img = Image.new('RGB', (size * 4, size * 4), '#181818')  # nền đặc: iPhone tự bo góc
    draw = ImageDraw.Draw(img)
    for x, y, w, h in BARS:
        box = [x * scale, y * scale, (x + w) * scale, (y + h) * scale]
        draw.rounded_rectangle(box, radius=w / 2 * scale, fill='#ffffff')
    img.resize((size, size), Image.LANCZOS).save(OUT / name, optimize=True)
