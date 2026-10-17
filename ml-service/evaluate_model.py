
from pathlib import Path
import tensorflow as tf
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix

MODEL_PATH = Path("models/civicshield_mobilenetv2_finetuned.keras")
TEST_DIR = Path("dataset/ucf-crime/test")

# The original test set remains separate from training.
if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Model not found: {MODEL_PATH.resolve()}")

if not TEST_DIR.exists():
    raise FileNotFoundError(f"Test folder not found: {TEST_DIR.resolve()}")

IMAGE_SIZE = (160, 160)
BATCH_SIZE = 16

test_ds = tf.keras.utils.image_dataset_from_directory(
    TEST_DIR,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    shuffle=False,
)

class_names = test_ds.class_names

model = tf.keras.models.load_model(MODEL_PATH)

print("\nEvaluating on the separate test set...")
results = model.evaluate(test_ds, verbose=1)

for name, value in zip(model.metrics_names, results):
    print(f"{name}: {value:.4f}")

y_true = np.concatenate([labels.numpy() for _, labels in test_ds])

probabilities = model.predict(test_ds, verbose=1)
y_pred = np.argmax(probabilities, axis=1)

print("\nClassification report:")
print(classification_report(
    y_true,
    y_pred,
    labels=list(range(len(class_names))),
    target_names=class_names,
    zero_division=0,
))

print("\nConfusion matrix:")
print(confusion_matrix(y_true, y_pred))

print("\nEvaluation completed.")
