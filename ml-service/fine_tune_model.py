
from pathlib import Path
import tensorflow as tf

BASE_DIR = Path("dataset/ucf-crime-validation-split")
TRAIN_DIR = BASE_DIR / "train"
VAL_DIR = BASE_DIR / "val"
MODEL_DIR = Path("models")
MODEL_PATH = MODEL_DIR / "civicshield_mobilenetv2_finetuned.keras"

IMAGE_SIZE = (160, 160)
BATCH_SIZE = 16
EPOCHS = 5
SEED = 42

train_ds = tf.keras.utils.image_dataset_from_directory(
    TRAIN_DIR,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    shuffle=True,
    seed=SEED,
)

val_ds = tf.keras.utils.image_dataset_from_directory(
    VAL_DIR,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    shuffle=False,
)

class_names = train_ds.class_names
print("Classes:", class_names)

# Build the same MobileNetV2 architecture.
base_model = tf.keras.applications.MobileNetV2(
    input_shape=(*IMAGE_SIZE, 3),
    include_top=False,
    weights="imagenet",
)

base_model.trainable = False

inputs = tf.keras.Input(shape=(*IMAGE_SIZE, 3))
x = tf.keras.applications.mobilenet_v2.preprocess_input(inputs)
x = base_model(x, training=False)
x = tf.keras.layers.GlobalAveragePooling2D()(x)
x = tf.keras.layers.Dropout(0.3)(x)
outputs = tf.keras.layers.Dense(
    len(class_names),
    activation="softmax",
)(x)

model = tf.keras.Model(inputs, outputs)

# Load the best weights learned in the previous training stage.
previous_model = tf.keras.models.load_model(
    "models/civicshield_mobilenetv2_validated.keras"
)
model.set_weights(previous_model.get_weights())
del previous_model

# Unfreeze only the last 30 base-model layers.
base_model.trainable = True

for layer in base_model.layers[:-30]:
    layer.trainable = False

# Keep BatchNormalization layers frozen for more stable fine-tuning.
for layer in base_model.layers:
    if isinstance(layer, tf.keras.layers.BatchNormalization):
        layer.trainable = False

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"],
)

MODEL_DIR.mkdir(parents=True, exist_ok=True)

callbacks = [
    tf.keras.callbacks.ModelCheckpoint(
        str(MODEL_PATH),
        monitor="val_loss",
        save_best_only=True,
    ),
    tf.keras.callbacks.EarlyStopping(
        monitor="val_loss",
        patience=2,
        restore_best_weights=True,
    ),
]

history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=EPOCHS,
    callbacks=callbacks,
)

print("\nFine-tuning completed.")
print("Best model:", MODEL_PATH.resolve())
print("Best validation accuracy:", max(history.history["val_accuracy"]))
print("Best validation loss:", min(history.history["val_loss"]))
