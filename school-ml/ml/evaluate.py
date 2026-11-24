import argparse
import json
from collections import Counter

import joblib
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support

from ml.dataset import INCIDENT_TYPES, LEVELS, load_baseline, load_reports
from ml.predict import MODEL_PATH, TYPE_MODEL_PATH
from ml.train import pipeline


def evaluate(reports, predictions, target, labels):
    expected = [getattr(report, target) for report in reports]
    precision, recall, f1, _ = precision_recall_fscore_support(
        expected, predictions, labels=labels, average="macro", zero_division=0
    )
    return {
        "accuracy": accuracy_score(expected, predictions),
        "precision_macro": precision, "recall_macro": recall, "f1_macro": f1,
        "labels": labels,
        "confusion_matrix": confusion_matrix(expected, predictions, labels=labels).tolist(),
        "errors": [
            {"scenario": report.scenario, "expected": actual, "predicted": int(pred) if target == "level" else str(pred)}
            for report, actual, pred in zip(reports, expected, predictions, strict=True) if actual != pred
        ],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--without-bert", action="store_true")
    args = parser.parse_args()
    splits = load_reports()
    reports = splits["test"]
    texts = [report.text for report in reports]
    original = load_baseline()
    baseline = pipeline().fit([report.text for report in original], [report.level for report in original])
    results = {
        "distribution": {
            split: {"total": len(rows), "gravity": Counter(r.level for r in rows),
                    "type": Counter(r.incident_type for r in rows)}
            for split, rows in splits.items()
        },
        "tfidf_before_gravity": evaluate(reports, baseline.predict(texts), "level", list(LEVELS)),
        "tfidf_after_gravity": evaluate(
            reports, joblib.load(MODEL_PATH).predict(texts), "level", list(LEVELS)
        ),
        "tfidf_after_type": evaluate(
            reports, joblib.load(TYPE_MODEL_PATH).predict(texts), "incident_type", list(INCIDENT_TYPES)
        ),
    }
    if not args.without_bert:
        from nlp.nlp_service import classify_report_fr

        results["bert_keywords_gravity"] = evaluate(
            reports, [classify_report_fr(text)["level"] for text in texts], "level", list(LEVELS)
        )
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
