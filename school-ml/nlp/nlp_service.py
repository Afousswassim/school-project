from threading import Lock

BERT_MODEL = "nlptown/bert-base-multilingual-uncased-sentiment"
BERT_REVISION = "8f6f4e3a8f70be4b65d3a4a8762b6d781cda240d"
_classifier = None
_load_lock = Lock()


def load_classifier():
    global _classifier
    with _load_lock:
        if _classifier is None:
            from transformers import pipeline

            _classifier = pipeline(
                "sentiment-analysis",
                model=BERT_MODEL,
                revision=BERT_REVISION,
                model_kwargs={"use_safetensors": True},
                device=-1,
            )
    return _classifier

# Keywords pour détecter la gravité
SEVERE_KEYWORDS = [
    "violence", "violent", "frapper", "frappe", "frappé", "bagarre", "sang",
    "blessure", "blessé", "arme", "drogue", "alcool", "agression", "agresser", "agressé",
    "danger", "menace grave", "coup", "battre", "battu", "tuer", "mort", "attaque"
]

MODERATE_KEYWORDS = [
    "insulte", "insulté", "insulter", "triché", "triche", "tricherie",
    "refus", "refuse", "refusé", "refuser", "menace", "menacer",
    "irrespectueux", "insolence", "insolent", "crié", "crie", "crier",
    "malhonnête", "malhonneté"
]

MINOR_KEYWORDS = [
    "retard", "retardé", "bavardage", "bavard", "bavarder",
    "distraction", "distrait", "oubli", "oublié", "oublier",
    "devoirs", "devoir", "léger", "légère", "première fois", "mineur", "mineure"
]

def classify_report_fr(text: str) -> dict:
    """
    Analyse hybride: mots-clés + sentiment BERT
    Retourne le niveau disciplinaire (1=mineur, 2=modéré, 3=grave)
    """
    result = load_classifier()(text, truncation=True)[0]

    stars = int(result["label"][0])  # 1 à 5
    confidence = round(result["score"], 3)
    text_lower = text.lower()

    # Compter les mots-clés
    severe_count = sum(1 for word in SEVERE_KEYWORDS if word in text_lower)
    moderate_count = sum(1 for word in MODERATE_KEYWORDS if word in text_lower)
    minor_count = sum(1 for word in MINOR_KEYWORDS if word in text_lower)

    # Logique de décision (priorité aux mots-clés)
    if severe_count > 0:
        level = 3
        reason = "Mots-clés graves détectés"
    elif moderate_count > 0:
        level = 2
        reason = "Mots-clés modérés détectés"
    elif minor_count > 0:
        level = 1
        reason = "Incident mineur détecté"
    else:
        # Fallback sur sentiment BERT
        # IMPORTANT: Plus c'est négatif (1-2 stars) = plus grave
        if stars <= 2:
            level = 3
            reason = "Sentiment très négatif"
        elif stars == 3:
            level = 2
            reason = "Sentiment neutre"
        else:  # stars >= 4
            level = 1
            reason = "Sentiment moins négatif"

    return {
        "level": level,
        "stars": stars,
        "confidence": confidence,
        "reason": reason
    }
