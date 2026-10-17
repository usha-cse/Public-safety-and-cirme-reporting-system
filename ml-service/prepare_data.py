
from pathlib import Path
import tensorflow as tf

# Dataset folders
DATASET_DIR = Path("dataset/ucf-crime")
TRAIN_DIR = DATASET_DIR / "train"
TEST_DIR = DATASET_DIR / "test"

# Model input settings
IMAGE_SIZE = (160, 160)
BATCH_SIZE = 32
SEED = 42

if not TRAIN_DIR.exists() or not TEST_DIR.exists():
    raise FileNotFoundError(
        "Could not find train/test folders. Check DATASET_DIR."
    )

# Read images from class subfolders.
# Keep the existing test set separate.
train_ds = tf.keras.utils.image_dataset_from_directory(
    TRAIN_DIR,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    shuffle=True,
    seed=SEED,
)

test_ds = tf.keras.utils.image_dataset_from_directory(
    TEST_DIR,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    shuffle=False,
)

print("\nClass names:")
print(train_ds.class_names)

print("\nTraining batches:", tf.data.experimental.cardinality(train_ds).numpy())
print("Test batches:", tf.data.experimental.cardinality(test_ds).numpy())

# Verify one batch without loading the whole dataset into memory.
images, labels = next(iter(train_ds))

print("\nOne batch:")
print("Image shape:", images.shape)
print("Label shape:", labels.shape)
print("Image data type:", images.dtype)
print("Label data type:", labels.dtype)

# Prefetch helps prepare the next batch while the current one is processed.
train_ds = train_ds.prefetch(tf.data.AUTOTUNE)
test_ds = test_ds.prefetch(tf.data.AUTOTUNE)

print("\nData pipeline check completed successfully.")
