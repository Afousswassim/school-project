import csv
from dataclasses import dataclass
from pathlib import Path

from ml.predict import LEVELS


DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "rapports_fictifs.csv"


@dataclass(frozen=True)
class Report:
    scenario: str
    level: int
    text: str


def load_reports() -> dict[str, list[Report]]:
    splits = {"train": [], "test": []}
    scenarios = set()
    texts = set()
    with DATA_PATH.open(encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source, delimiter=";"):
            scenario = row["scenario"]
            level = int(row["gravite"])
            if scenario in scenarios or level not in LEVELS:
                raise ValueError(f"Scénario dupliqué ou gravité invalide : {scenario}")
            scenarios.add(scenario)
            reports = splits[row["ensemble"]]
            for column in ("rapport_a", "rapport_b"):
                report = row[column].strip()
                normalized = report.casefold()
                if not report or normalized in texts:
                    raise ValueError(f"Rapport vide ou dupliqué : {scenario}, {column}")
                texts.add(normalized)
                reports.append(Report(scenario, level, report))

    for split, reports in splits.items():
        if {report.level for report in reports} != set(LEVELS):
            raise ValueError(f"L’ensemble {split} doit contenir les trois classes.")
    return splits
