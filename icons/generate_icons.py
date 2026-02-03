#!/usr/bin/env python3
"""
アイコン画像生成スクリプト
Pillowライブラリを使用して、シンプルなアイコン画像を生成します。

使用方法:
  pip install pillow
  python generate_icons.py
"""

from PIL import Image, ImageDraw

def create_icon(size):
    """指定サイズのアイコンを作成"""
    # 背景（赤）
    img = Image.new('RGB', (size, size), color='#FF0000')
    draw = ImageDraw.Draw(img)

    # 再生ボタン（三角形）
    scale = size / 128
    triangle = [
        (35 * scale, 28 * scale),
        (35 * scale, 100 * scale),
        (95 * scale, 64 * scale)
    ]
    draw.polygon(triangle, fill='white')

    # 次へアイコン（二重線）
    line_width = max(1, int(6 * scale))
    draw.line([(90 * scale, 42 * scale), (90 * scale, 86 * scale)],
              fill='white', width=line_width)
    draw.line([(98 * scale, 42 * scale), (98 * scale, 86 * scale)],
              fill='white', width=line_width)

    return img

# 各サイズのアイコンを生成
sizes = [16, 48, 128]

for size in sizes:
    icon = create_icon(size)
    filename = f'icon{size}.png'
    icon.save(filename)
    print(f'{filename} を作成しました')

print('\nアイコン生成完了！')
