
from pathlib import Path
from collections import Counter
import random
import numpy as np
import tensorflow as tf

MODEL_PATH = Path("models/civicshield_mobilenetv2_small.keras")
TEST_DIR = Path("dataset/ucf-crime/test")
IMAGE_SIZE = (160, 160)
SAMPLES_PER_CLASS = 50
SEED = 42

random.seed(SEED)

model = tf.keras.models.load_model(MODEL_PATH)
class_names = sorted(
    p.name for p in TEST_DIR.iterdir() if p.is_dir()
)

actual_counts = Counter()
predicted_counts = Counter()

print("Sampling up to 50 images from every class...\n")

for class_index, class_name in enumerate(class_names):
    class_dir = TEST_DIR / class_name
    paths = [
        p for p in class_dir.iterdir()
        if p.is_file()
        and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    ]

    selected = random.sample(paths, min(SAMPLES_PER_CLASS, len(paths)))
    images = []

    for path in selected:
        try:
            image = tf.keras.utils.load_img(
                path, target_size=IMAGE_SIZE
            )
            images.append(tf.keras.utils.img_to_array(image))
        except Exception as error:
            print(f"Skipping unreadable image: {path} ({error})")

    if not images:
        continue

    batch = np.stack(images)
    probabilities = model.predict(batch, verbose=0)
    predictions = np.argmax(probabilities, axis=1)

    actual_counts[class_name] += len(images)

    for prediction in predictions:
        predicted_counts[class_names[prediction]] += 1

print("Sampled actual images:")
for name in class_names:
    print(f"{name:16s}: {actual_counts[name]}")

print("\nPredictions across the balanced sample:")
for name in class_names:
    print(f"{name:16s}: {predicted_counts[name]}")

print("\nPrediction check complete.")
