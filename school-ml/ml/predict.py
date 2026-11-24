from pathlib import Path

import joblib

from ml.dataset import INCIDENT_TYPES, LEVELS


MODEL_PATH = Path(__file__).resolve().parents[1] / "artifacts" / "gravite.joblib"
TYPE_MODEL_PATH = MODEL_PATH.with_name("type_incident.joblib")


def distribution(model, report_text, labels):
    if set(model.classes_) != set(labels):
        raise ValueError("Classes inattendues dans le modèle disciplinaire.")
    vectorizer = model.named_steps["tfidf"]
    features = vectorizer.transform([report_text])
    scores = model.named_steps["logistic"].predict_proba(features)[0]
    classes = model.classes_
    best, second = scores.argsort()[-2:][::-1]
    # Mesure la couverture dans le vocabulaire du modèle, y compris sur les textes très courts.
    tokens = vectorizer.build_analyzer()(report_text)
    coverage = sum(token in vectorizer.vocabulary_ for token in tokens) / max(len(tokens), 1)
    return (
        classes[best],
        {labels[class_id]: float(score) for class_id, score in zip(classes, scores, strict=True)},
        float(scores[best]), float(scores[best] - scores[second]), coverage,
    )


def predict_gravity(report_text):
    gravity_model = joblib.load(MODEL_PATH)
    level, probabilities, score, margin, coverage = distribution(
        gravity_model, report_text, LEVELS
    )
    return {
        "disciplinary_level": int(level),
        "level_label": LEVELS[level],
        "probabilities": probabilities,
        "gravity_uncertain": score < 0.65 or margin < 0.20 or coverage < 0.30,
    }


def predict_incident(report_text):
    type_model = joblib.load(TYPE_MODEL_PATH)
    kind, probabilities, score, margin, coverage = distribution(
        type_model, report_text, {label: label for label in INCIDENT_TYPES}
    )
    return {
        "incident_type": str(kind),
        "incident_type_probabilities": probabilities,
        "incident_type_uncertain": score < 0.55 or margin < 0.20 or coverage < 0.30,
    }
