from flask import Flask, jsonify, request

from ml.predict import predict_gravity, predict_incident

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024


def report_text():
    body = request.get_json(silent=True)
    text = body.get("report_text") if isinstance(body, dict) else None
    return text.strip() if isinstance(text, str) else ""


@app.post("/api/analyze-report")
def analyze_report():
    text = report_text()
    if not text:
        return jsonify(error="Saisissez un rapport non vide."), 400

    from nlp.nlp_service import classify_report_fr

    result = classify_report_fr(text)
    return jsonify(
        disciplinary_level=result["level"],
        details={key: result[key] for key in ("stars", "confidence", "reason")},
    )


@app.post("/api/analyze-report-ml")
def analyze_report_ml():
    text = report_text()
    if not text:
        return jsonify(error="Saisissez un rapport non vide."), 400

    try:
        result = predict_gravity(text)
    except Exception:
        app.logger.exception("Modèle de gravité TF-IDF indisponible.")
        return jsonify(error="L’analyse de gravité TF-IDF est momentanément indisponible."), 503

    try:
        result.update(predict_incident(text))
    except Exception:
        app.logger.exception("Modèle de type d’incident TF-IDF indisponible.")
        result.update(incident_type=None, incident_type_uncertain=True)
    result["requires_human_review"] = result["gravity_uncertain"] or result["incident_type_uncertain"]
    return jsonify(result)
