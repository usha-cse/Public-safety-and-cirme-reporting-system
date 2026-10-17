
from pathlib import Path
import tensorflow as tf

# Dataset and output paths
TRAIN_DIR = Path("dataset/ucf-crime-small/train")
MODEL_DIR = Path("models")
MODEL_PATH = MODEL_DIR / "civicshield_mobilenetv2_small.keras"

IMAGE_SIZE = (160, 160)
BATCH_SIZE = 16
SEED = 42
EPOCHS = 3

if not TRAIN_DIR.exists():
    raise FileNotFoundError(
        f"Training folder not found: {TRAIN_DIR.resolve()}"
    )

# Load the balanced training subset
train_ds = tf.keras.utils.image_dataset_from_directory(
    TRAIN_DIR,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
    shuffle=True,
    seed=SEED,
)

class_names = train_ds.class_names
num_classes = len(class_names)

print("\nClasses:", class_names)
print("Number of classes:", num_classes)

# Load pretrained MobileNetV2
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
    num_classes,
    activation="softmax",
)(x)

model = tf.keras.Model(inputs, outputs)

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"],
)

MODEL_DIR.mkdir(parents=True, exist_ok=True)

# Save the model after each completed epoch.
checkpoint = tf.keras.callbacks.ModelCheckpoint(
    filepath=str(MODEL_PATH),
    save_best_only=False,
    save_weights_only=False,
)

print("\nStarting small-dataset training...")
history = model.fit(
    train_ds,
    epochs=EPOCHS,
    callbacks=[checkpoint],
)

print("\nTraining finished.")
print("Model saved to:", MODEL_PATH.resolve())
print("Class order:", class_names)
