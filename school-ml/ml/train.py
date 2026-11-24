from pathlib import Path
from tempfile import TemporaryDirectory

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from ml.dataset import load_reports
from ml.predict import MODEL_PATH


def main():
    reports = load_reports()["train"]
    model = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2))),
        ("logistic", LogisticRegression(max_iter=1000, random_state=42)),
    ])
    model.fit([report.text for report in reports], [report.level for report in reports])

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=MODEL_PATH.parent) as directory:
        temporary_model = Path(directory) / MODEL_PATH.name
        joblib.dump(model, temporary_model, compress=3)
        temporary_model.replace(MODEL_PATH)

    print(f"{len(reports)} rapports d’entraînement. Modèle enregistré dans {MODEL_PATH}")


if __name__ == "__main__":
    main()
