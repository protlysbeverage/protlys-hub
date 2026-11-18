
from PIL import Image

BACKGROUND = (13, 15, 14, 255)

logo = Image.open(
    "assets/images/protlys-logo-dark.png"
).convert("RGBA")

def fit_logo(max_width, max_height):
    image = logo.copy()
    image.thumbnail(
        (max_width, max_height),
        Image.Resampling.LANCZOS
    )
    return image

# 1. Main launcher icon: 1024 x 1024
icon = Image.new("RGBA", (1024, 1024), BACKGROUND)
mark = fit_logo(800, 390)
x = (1024 - mark.width) // 2
y = (1024 - mark.height) // 2
icon.alpha_composite(mark, (x, y))
icon.convert("RGB").save("assets/images/icon.png")

# 2. Android adaptive icon foreground: 512 x 512
foreground = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
mark = fit_logo(390, 190)
x = (512 - mark.width) // 2
y = (512 - mark.height) // 2
foreground.alpha_composite(mark, (x, y))
foreground.save("assets/images/android-icon-foreground.png")

# 3. Android adaptive icon background: 512 x 512
background = Image.new("RGBA", (512, 512), BACKGROUND)
background.save("assets/images/android-icon-background.png")

# 4. Android themed icon: monochrome logo silhouette
mono = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
mark = fit_logo(330, 160)

alpha = mark.getchannel("A")
white_mark = Image.new("RGBA", mark.size, (255, 255, 255, 0))
white_mark.putalpha(alpha)

x = (432 - mark.width) // 2
y = (432 - mark.height) // 2
mono.alpha_composite(white_mark, (x, y))
mono.save("assets/images/android-icon-monochrome.png")

print("Protlys launcher assets created successfully.")
print("Original logo files were not modified.")
