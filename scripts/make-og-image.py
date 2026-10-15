"""Builds public/assets/og-image.png (1200x630) — the link preview for WhatsApp/Facebook.

Usage: python3 scripts/make-og-image.py   (needs Pillow with libraqm for right-to-left Hebrew)
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "assets" / "og-image.png"
W, H = 1200, 630
NAVY, BRASS, ACTION = (11, 31, 58), (211, 176, 122), (0, 113, 227)
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"



def main():
    img = Image.new("RGB", (W, H), NAVY)

    blobs = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(blobs)
    d.ellipse((760, -260, 1460, 440), fill=BRASS + (120,))
    d.ellipse((-300, 300, 420, 1020), fill=ACTION + (110,))
    blobs = blobs.filter(ImageFilter.GaussianBlur(120))
    img.paste(blobs, (0, 0), blobs)

    # Glass card
    card = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(card).rounded_rectangle((80, 90, 1120, 540), radius=40,
                                           fill=(255, 255, 255, 30), outline=(255, 255, 255, 70), width=2)
    img.paste(card, (0, 0), card)

    draw = ImageDraw.Draw(img)
    rtl = {"direction": "rtl", "language": "he"}
    right = 1060
    title = ImageFont.truetype(FONT_BOLD, 74)
    sub = ImageFont.truetype(FONT, 38)
    small = ImageFont.truetype(FONT_BOLD, 30)

    draw.text((right, 150), "אזרחות גרמנית", font=title, fill=(255, 255, 255), anchor="ra", **rtl)
    draw.text((right, 245), "לצאצאי יוצאי גרמניה", font=title, fill=BRASS, anchor="ra", **rtl)
    draw.text((right, 370), "בדיקת זכאות בדקה אחת · 5 שאלות", font=sub, fill=(225, 230, 240), anchor="ra", **rtl)

    # Pill "button"
    draw.rounded_rectangle((right - 330, 440, right, 500), radius=30, fill=ACTION)
    draw.text((right - 165, 470), "לבדיקה חינם", font=small, fill=(255, 255, 255), anchor="mm", **rtl)
    draw.text((140, 470), "ידיד ושות' · עורכי דין", font=small, fill=(225, 230, 240), anchor="lm", **rtl)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
