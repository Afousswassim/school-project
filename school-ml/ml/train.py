import json
from pathlib import Path
from tempfile import TemporaryDirectory

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, StratifiedGroupKFold
from sklearn.pipeline import Pipeline

from ml.dataset import load_reports
from ml.predict import MODEL_PATH, TYPE_MODEL_PATH


def pipeline():
    return Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2))),
        ("logistic", LogisticRegression(max_iter=1000, random_state=42)),
    ])


def main():
    reports = load_reports()["train"]
    texts = [report.text for report in reports]
    groups = [report.scenario for report in reports]
    folds = list(StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42).split(
        texts, [f"{report.level}:{report.incident_type}" for report in reports], groups
    ))
    parameters = [
        {"tfidf__analyzer": ["word"], "tfidf__ngram_range": [(1, 1), (1, 2)]},
        {"tfidf__analyzer": ["char_wb"], "tfidf__ngram_range": [(3, 5)]},
    ]
    for grid in parameters:
        grid.update(tfidf__min_df=[1, 2], tfidf__sublinear_tf=[False, True],
                    logistic__C=[0.5, 2, 8])

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=MODEL_PATH.parent) as directory:
        staged = []
        for path, target in ((MODEL_PATH, "level"), (TYPE_MODEL_PATH, "incident_type")):
            labels = [getattr(report, target) for report in reports]
            search = GridSearchCV(pipeline(), parameters, cv=folds, scoring="f1_macro",
                                  error_score="raise")
            search.fit(texts, labels)
            temporary = Path(directory) / path.name
            joblib.dump(search.best_estimator_, temporary, compress=3)
            staged.append((temporary, path))
            print(json.dumps({
                "model": path.name, "reports": len(reports), "groups": len(set(groups)),
                "f1_macro_cv": search.best_score_, "parameters": search.best_params_,
            }, ensure_ascii=False))
        for temporary, path in staged:
            temporary.replace(path)


if __name__ == "__main__":
    main()
