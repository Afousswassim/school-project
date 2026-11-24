import csv
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parents[1] / "data"
LEVELS = {1: "mineur", 2: "modéré", 3: "grave"}
INCIDENT_TYPES = (
    "Retard", "Absence injustifiée", "Triche", "Insulte",
    "Perturbation du cours", "Non-respect des consignes", "Dégradation du matériel",
    "Harcèlement", "Menace", "Agression physique",
)


@dataclass(frozen=True)
class Report:
    scenario: str
    level: int | None
    incident_type: str
    text: str


def read_rows(filename):
    with (DATA_DIR / filename).open(encoding="utf-8", newline="") as source:
        return list(csv.DictReader(source, delimiter=";"))


def load_baseline():
    return [
        Report(row["scenario"], int(row["gravite"]), "", row[column])
        for row in read_rows("rapports_baseline.csv") if row["ensemble"] == "train"
        for column in ("rapport_a", "rapport_b")
    ]


def load_reports():
    splits = {"train": [], "test": [], "verification": []}
    groups = {}
    texts = set()
    baseline = {normalized_text(report.text) for report in load_baseline()}
    for row in read_rows("rapports_fictifs.csv"):
        scenario = row["scenario"].strip()
        split = row["ensemble"]
        level = int(row["gravite"]) if row["gravite"] else None
        incident_type = row["type_incident"]
        key = (split, level, incident_type)
        if not scenario or groups.setdefault(scenario, key) != key:
            raise ValueError(f"Scénario incohérent ou partagé entre ensembles : {scenario}")
        if split == "verification":
            if level is not None or incident_type:
                raise ValueError(f"Étiquettes inattendues pour un cas à vérifier : {scenario}")
        elif level not in LEVELS or incident_type not in INCIDENT_TYPES:
            raise ValueError(f"Étiquette invalide : {scenario}")
        report = row["rapport"].strip()
        normalized = normalized_text(report)
        if not normalized or normalized in texts or (split != "train" and normalized in baseline):
            raise ValueError(f"Rapport vide, dupliqué ou déjà vu par la baseline : {scenario}")
        texts.add(normalized)
        splits[split].append(Report(scenario, level, incident_type, report))

    for split in ("train", "test"):
        if ({report.level for report in splits[split]} != set(LEVELS)
                or {report.incident_type for report in splits[split]} != set(INCIDENT_TYPES)):
            raise ValueError(f"Classes manquantes dans {split}")
    return splits


def normalized_text(text):
    return " ".join(re.findall(r"\w+", unicodedata.normalize("NFKC", text).casefold()))
