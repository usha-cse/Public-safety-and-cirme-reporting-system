
from pathlib import Path
import random
from PIL import Image

DATASET_DIR = Path("dataset/ucf-crime")
SPLITS = ["train", "test"]
EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

random.seed(42)

for split in SPLITS:
    split_dir = DATASET_DIR / split
    print(f"\n--- {split.upper()} IMAGE CHECK ---")

    if not split_dir.exists():
        print(f"Missing folder: {split_dir.resolve()}")
        continue

    files = [
        p
        for p in split_dir.rglob("*")
        if p.is_file() and p.suffix.lower() in EXTENSIONS
    ]

    print(f"Images found: {len(files)}")

    if not files:
        continue

    samples = random.sample(files, min(5, len(files)))

    for path in samples:
        try:
            with Image.open(path) as img:
                img.verify()

            with Image.open(path) as img:
                print(
                    f"OK | {path.relative_to(DATASET_DIR)} "
                    f"| size={img.size} | mode={img.mode}"
                )
        except Exception as error:
            print(f"BAD IMAGE | {path} | {error}")
