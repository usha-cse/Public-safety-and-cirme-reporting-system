
from pathlib import Path
import random
import shutil

SOURCE_DIR = Path("dataset/ucf-crime/train")
OUTPUT_DIR = Path("dataset/ucf-crime-small/train")

IMAGES_PER_CLASS = 500
SEED = 42

EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
random.seed(SEED)

if not SOURCE_DIR.exists():
    raise FileNotFoundError(f"Training folder not found: {SOURCE_DIR.resolve()}")

for class_dir in sorted(SOURCE_DIR.iterdir()):
    if not class_dir.is_dir():
        continue

    images = [
        p for p in class_dir.iterdir()
        if p.is_file() and p.suffix.lower() in EXTENSIONS
    ]

    # If there are fewer than the target, use all available images.
    selected = random.sample(images, min(IMAGES_PER_CLASS, len(images)))

    destination = OUTPUT_DIR / class_dir.name
    destination.mkdir(parents=True, exist_ok=True)

    for image_path in selected:
        target = destination / image_path.name
        if not target.exists():
            shutil.copy2(image_path, target)

    print(f"{class_dir.name}: copied {len(selected)} images")

print("\nBalanced subset created at:", OUTPUT_DIR.resolve())
print("Original dataset and test set were not modified.")
