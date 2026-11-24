from pathlib import Path

import joblib


LEVELS = {1: "mineur", 2: "modéré", 3: "grave"}
MODEL_PATH = Path(__file__).resolve().parents[1] / "artifacts" / "gravite.joblib"
TYPE_MODEL_PATH = MODEL_PATH.with_name("type.joblib")


def load_model():
    return joblib.load(MODEL_PATH)


def predict_gravity(report_text: str) -> dict:
    model = load_model()
    probabilities = model.predict_proba([report_text])[0]
    level = int(model.classes_[probabilities.argmax()])
    return {
        "disciplinary_level": level,
        "level_label": LEVELS[level],
        "probabilities": {
            LEVELS[int(class_id)]: float(probability)
            for class_id, probability in zip(model.classes_, probabilities, strict=True)
        },
    }


def predict_type(report_text: str) -> str | None:
    try:
        model = joblib.load(TYPE_MODEL_PATH)
    except FileNotFoundError:
        return None
    return str(model.predict([report_text])[0])
