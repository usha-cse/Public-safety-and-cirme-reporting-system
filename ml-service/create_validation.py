
from pathlib import Path
import random
import shutil

SOURCE_DIR = Path("dataset/ucf-crime-small/train")
TRAIN_OUT = Path("dataset/ucf-crime-validation-split/train")
VAL_OUT = Path("dataset/ucf-crime-validation-split/val")

VAL_PER_CLASS = 100
SEED = 42
EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

random.seed(SEED)

if not SOURCE_DIR.exists():
    raise FileNotFoundError(f"Missing folder: {SOURCE_DIR.resolve()}")

for class_dir in sorted(SOURCE_DIR.iterdir()):
    if not class_dir.is_dir():
        continue

    images = [
        p for p in class_dir.iterdir()
        if p.is_file() and p.suffix.lower() in EXTENSIONS
    ]

    if len(images) <= VAL_PER_CLASS:
        raise ValueError(f"Not enough images in {class_dir.name}")

    random.shuffle(images)
    val_images = images[:VAL_PER_CLASS]
    train_images = images[VAL_PER_CLASS:]

    for output_dir, selected in [
        (TRAIN_OUT / class_dir.name, train_images),
        (VAL_OUT / class_dir.name, val_images),
    ]:
        output_dir.mkdir(parents=True, exist_ok=True)

        for source in selected:
            destination = output_dir / source.name
            if not destination.exists():
                shutil.copy2(source, destination)

    print(
        f"{class_dir.name}: "
        f"{len(train_images)} train, {len(val_images)} validation"
    )

print("\nValidation split created.")
print("Training:", TRAIN_OUT.resolve())
print("Validation:", VAL_OUT.resolve())
print("Original dataset and test set were not modified.")
