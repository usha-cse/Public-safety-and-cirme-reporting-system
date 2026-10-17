

from pathlib import Path
import tensorflow as tf

MODEL_PATH = Path("models/civicshield_mobilenetv2_finetuned.keras")
TRAIN_DIR = Path("dataset/ucf-crime-validation-split/train")
TEST_DIR = Path("dataset/ucf-crime/test")

train_classes = sorted(
    folder.name for folder in TRAIN_DIR.iterdir()
    if folder.is_dir()
)

test_classes = sorted(
    folder.name for folder in TEST_DIR.iterdir()
    if folder.is_dir()
)

model = tf.keras.models.load_model(MODEL_PATH)

print("Training class order:")
for i, name in enumerate(train_classes):
    print(i, name)

print("\nTest class order:")
for i, name in enumerate(test_classes):
    print(i, name)

print("\nModel output shape:", model.output_shape)

print("\nTraining/test class order matches:",
      train_classes == test_classes)

print("Output count matches test classes:",
      model.output_shape[-1] == len(test_classes))

if train_classes != test_classes:
    print("\nWARNING: Training and test class mappings differ!")

if model.output_shape[-1] != len(test_classes):
    print("\nWARNING: Model output count does not match test classes!")
