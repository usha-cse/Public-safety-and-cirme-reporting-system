
from pathlib import Path

DATASET_DIR = Path("dataset/ucf-crime")
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

if not DATASET_DIR.exists():
    print(f"Dataset folder not found: {DATASET_DIR.resolve()}")
    print("Update DATASET_DIR to your actual extracted dataset path.")
    raise SystemExit(1)

for split in ("train", "test"):
    split_dir = DATASET_DIR / split

    print(f"\n--- {split.upper()} ---")

    if not split_dir.exists():
        print(f"Folder not found: {split_dir}")
        continue

    total = 0

    for category_dir in sorted(split_dir.iterdir()):
        if not category_dir.is_dir():
            continue

        count = sum(
            1 for file in category_dir.rglob("*")
            if file.is_file()
            and file.suffix.lower() in IMAGE_EXTENSIONS
        )

        print(f"{category_dir.name}: {count}")
        total += count

    print(f"Total images: {total}")
