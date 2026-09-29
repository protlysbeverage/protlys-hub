from collections import deque
from pathlib import Path
from PIL import Image

SRC = Path("public/protlys-logo-exact.png")
DST = Path("public/protlys-logo-dark.png")
OFF_WHITE = (0xEE, 0xF5, 0xF0)

img = Image.open(SRC).convert("RGBA")
w, h = img.size
px = img.load()

# The source is the exact uploaded artwork. Only near-black artwork is considered.
black = bytearray(w * h)
green = bytearray(w * h)

for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        i = y * w + x
        if a and max(r, g, b) < 60:
            black[i] = 1
        if a and g > 70 and g > r * 1.20 and g > b * 1.08:
            green[i] = 1

# Connected components of near-black pixels.
components = []
seen = bytearray(w * h)

for start in range(w * h):
    if not black[start] or seen[start]:
        continue
    q = [start]
    seen[start] = 1
    pixels = []
    min_x = max_x = start % w
    min_y = max_y = start // w
    green_adj = 0

    while q:
        i = q.pop()
        pixels.append(i)
        x, y = i % w, i // w
        min_x, max_x = min(min_x, x), max(max_x, x)
        min_y, max_y = min(min_y, y), max(max_y, y)

        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if not dx and not dy:
                    continue
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h:
                    ni = ny * w + nx
                    if green[ni]:
                        green_adj += 1
                    if black[ni] and not seen[ni]:
                        seen[ni] = 1
                        q.append(ni)

    components.append({
        "pixels": pixels,
        "area": len(pixels),
        "bbox": (min_x, min_y, max_x, max_y),
        "green_adj": green_adj,
    })

green_points = [i for i, v in enumerate(green) if v]
if not green_points:
    raise RuntimeError("Could not identify the green cup fill.")

gx = [i % w for i in green_points]
gy = [i // w for i in green_points]
green_bbox = (min(gx), min(gy), max(gx), max(gy))
green_area = len(green_points)

# The P is the small black component enclosed by the green cup.
# Select the small component closest to the green cup's center and keep it black.
gx_center = (green_bbox[0] + green_bbox[2]) / 2
gy_center = (green_bbox[1] + green_bbox[3]) / 2
green_w = max(1, green_bbox[2] - green_bbox[0])
green_h = max(1, green_bbox[3] - green_bbox[1])

candidates = []
for idx, c in enumerate(components):
    if c["area"] < 4 or c["area"] > green_area * 0.25:
        continue
    x0, y0, x1, y1 = c["bbox"]
    cx = (x0 + x1) / 2
    cy = (y0 + y1) / 2
    inside = (
        green_bbox[0] - green_w * 0.12 <= cx <= green_bbox[2] + green_w * 0.12 and
        green_bbox[1] - green_h * 0.12 <= cy <= green_bbox[3] + green_h * 0.12
    )
    if not inside:
        continue
    distance = ((cx - gx_center) / green_w) ** 2 + ((cy - gy_center) / green_h) ** 2
    green_score = c["green_adj"] / max(1, c["area"])
    candidates.append((distance - green_score * 0.15, -green_score, c["area"], idx))

if not candidates:
    raise RuntimeError("Could not safely isolate the black P inside the green cup.")

p_component = min(candidates)[3]

# Recolor black artwork while preserving alpha. Include nearby dark antialias pixels
# only when they are connected to selected black artwork, avoiding hard-edged halos.
selected = bytearray(w * h)
for idx, c in enumerate(components):
    if idx != p_component:
        for i in c["pixels"]:
            selected[i] = 1

# Expand one pixel around selected black artwork for antialiased edge pixels.
expanded = bytearray(selected)
for i, v in enumerate(selected):
    if not v:
        continue
    x, y = i % w, i // w
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                ni = ny * w + nx
                r, g, b, a = px[nx, ny]
                if a and max(r, g, b) < 220 and max(r, g, b) - min(r, g, b) < 55:
                    expanded[ni] = 1

for i, v in enumerate(expanded):
    if not v:
        continue
    x, y = i % w, i // w
    r, g, b, a = px[x, y]
    if not a:
        continue
    # Preserve the original alpha exactly; only change the dark artwork RGB.
    px[x, y] = (*OFF_WHITE, a)

img.save(DST, format="PNG", optimize=True)
check = Image.open(DST).convert("RGBA")
if check.size != img.size:
    raise RuntimeError("Dark logo dimensions changed.")
if "A" not in check.getbands():
    raise RuntimeError("Dark logo lost transparency.")

print(f"Created {DST} at {check.size}; preserved original source {SRC}.")
