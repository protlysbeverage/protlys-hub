
from PIL import Image

# Protlys brand colours
BACKGROUND = (13, 15, 14, 255)
SIZE = (1024, 1024)

# Load original dark logo
logo = Image.open("assets/images/protlys-logo-dark.png").convert("RGBA")

# Fit within a 820 x 399 area without stretching
logo.thumbnail((820, 399), Image.Resampling.LANCZOS)

# Create dark splash canvas
canvas = Image.new("RGBA", SIZE, BACKGROUND)

# Centre the original logo
x = (SIZE[0] - logo.width) // 2
y = (SIZE[1] - logo.height) // 2

canvas.alpha_composite(logo, (x, y))

# Save splash image
canvas.save("assets/images/splash-icon.png")

print("Protlys splash image created successfully.")
print("Canvas: 1024 x 1024")
print("Original logo proportions preserved.")
