"""
Improved India Evidence Engine for IdeaArena AI.

Separates contextual economic indicators from direct market evidence.
Does not generate fake demand scores.
"""

from pathlib import Path
import csv


DATASET_RULES = {
    "fintech": {
        "keywords": [
            "fintech", "digital payment", "payment gateway",
            "financial technology", "banking technology"
        ],
        "files": [
            "Foreign_Investment_Inflows.csv",
            "Foreign_Liabilities_and_Assets_for_Mutual_Fund"
        ]
    },
    "investment": {
        "keywords": [
            "investment", "investor", "funding",
            "venture capital", "foreign investment"
        ],
        "files": [
            "Foreign_Investment_Inflows.csv",
            "Foreign_Investment_Inflows_Annually.csv"
        ]
    },
    "trade": {
        "keywords": [
            "export", "import", "international trade",
            "logistics", "supply chain", "manufacturing"
        ],
        "files": [
            "Export_of_Principal_commodities.csv",
            "Import_of_Principal_commodities.csv",
            "Direction_of_Foreign_Trade.csv",
            "Broad_Commodity_Composition"
        ]
    },
    "agriculture": {
        "keywords": [
            "agriculture", "farmer", "farming",
            "crop", "irrigation", "fertilizer"
        ],
        "files": [
            "Export_of_Principal_commodities.csv",
            "Import_of_Principal_commodities.csv"
        ]
    },
    "health": {
        "keywords": [
            "health", "healthcare", "hospital",
            "medical", "medicine", "patient", "doctor"
        ],
        "files": []
    },
    "education": {
        "keywords": ["education", "student", "school", "college", "learning", "teaching", "tuition", "edtech", "university"],
        "files": []
    },
    "technology": {"keywords": ["technology", "software", "app", "internet", "digital", "saas", "ai", "artificial intelligence", "telecom", "mobile"], "files": []},
    "energy": {"keywords": ["energy", "electricity", "solar", "renewable", "power", "battery", "ev charging"], "files": []},
    "transport": {"keywords": ["transport", "transportation", "road", "vehicle", "mobility", "logistics", "delivery", "fleet", "traffic"], "files": []},
    "retail": {"keywords": ["retail", "consumer", "shopping", "ecommerce", "e-commerce", "grocery", "marketplace", "store"], "files": []},
    "employment": {"keywords": ["employment", "job", "jobs", "recruitment", "workforce", "skill", "unemployment", "career"], "files": []},
    "housing": {"keywords": ["housing", "real estate", "rental", "property", "urban", "construction"], "files": []},
    "startup": {"keywords": ["startup", "start-up", "entrepreneur", "venture", "small business", "msme", "business idea"], "files": []},
    "general": {"keywords": ["market", "business", "platform", "service", "customer", "consumer", "india", "indian"], "files": []}
}


def detect_industries(idea_text):
    text = idea_text.lower()
    detected = []

    for industry, rules in DATASET_RULES.items():
        matches = [
            keyword for keyword in rules["keywords"]
            if keyword in text
        ]

        if matches:
            detected.append({
                "industry": industry,
                "matched_keywords": matches
            })

    # Always attach broad India context when no specific sector keyword is detected.
    # This prevents a narrow keyword miss from becoming an empty-evidence result.
    if not detected:
        detected.append({"industry": "general", "matched_keywords": [], "fallback": True})
    return detected


def read_dataset(path):
    records = []

    try:
        with path.open(
            "r",
            encoding="utf-8-sig",
            errors="replace",
            newline=""
        ) as file:
            reader = csv.DictReader(file)
            columns = reader.fieldnames or []

            for row in reader:
                records.append(row)

        return records, columns, None

    except Exception as exc:
        return [], [], str(exc)


def extract_observations(records, columns, limit=10):
    observations = []

    excluded = {
        "time_period",
        "obs_value",
        "unit_measure"
    }

    dimensions = [
        column for column in columns
        if column not in excluded
    ]

    for row in records:
        raw_value = row.get("obs_value")

        try:
            value = float(raw_value.replace(",", "").strip())
        except (ValueError, AttributeError):
            continue

        observations.append({
            "period": row.get("time_period"),
            "value": value,
            "unit": row.get("unit_measure"),
            "dimensions": {
                key: row.get(key)
                for key in dimensions
                if row.get(key)
            }
        })

    observations.sort(
        key=lambda item: item["period"] or "",
        reverse=True
    )

    return observations[:limit]


def collect_world_bank_evidence(root, industries):
    """Read locally downloaded World Bank India indicator CSVs."""
    import json
    wb_dir = Path(root) / "world_bank_india"
    manifest_path = wb_dir / "manifest.json"
    if not manifest_path.exists():
        return [], [{"dataset": "World Bank India indicators", "error": "Not downloaded yet. Run scripts/download_sector_datasets.py with internet access."}]
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return [], [{"dataset": "World Bank manifest", "error": str(exc)}]

    evidence, errors = [], []
    wanted = {item["industry"] for item in industries}
    for item in manifest.get("datasets", []):
        overlap = sorted(wanted.intersection(item.get("industries", [])))
        if not overlap or item.get("status") != "downloaded":
            continue
        path = wb_dir / item.get("file", "")
        if not path.is_file():
            errors.append({"dataset": path.name, "error": "Manifest file is missing"})
            continue
        try:
            with path.open("r", encoding="utf-8-sig", newline="") as handle:
                rows = list(csv.DictReader(handle))
            valid = [row for row in rows if row.get("value") not in (None, "")]
            valid.sort(key=lambda row: row.get("year", ""), reverse=True)
            if not valid:
                continue
            evidence.append({
                "dataset": path.name,
                "matched_industry": overlap,
                "evidence_type": "contextual_indicator",
                "record_count": len(valid),
                "latest_period": valid[0].get("year"),
                "columns": list(valid[0].keys()),
                "observations": [{"period": row.get("year"), "value": float(row["value"]),
                    "unit": row.get("unit"), "dimensions": {"indicator": row.get("indicator_name"),
                    "indicator_code": row.get("indicator_code"), "country": row.get("country")}}
                    for row in valid[:10]],
                "source": "World Bank World Development Indicators",
                "source_url": item.get("source_url"),
                "source_verified": True,
                "limitations": ["National-level indicator; may not represent a specific city or customer segment.",
                    "Contextual evidence only; does not directly measure demand for this proposed product.",
                    "Use the indicator definition and unit before comparing values."]
            })
        except Exception as exc:
            errors.append({"dataset": path.name, "error": str(exc)})
    return evidence, errors


def collect_india_evidence(data_dir, idea_text):
    root = Path(data_dir)

    industries = detect_industries(idea_text)
    selected_files = {}

    for industry in industries:
        industry_name = industry["industry"]
        rules = DATASET_RULES[industry_name]

        for pattern in rules["files"]:
            for path in root.rglob("*.csv"):
                if pattern.lower() in path.name.lower():
                    selected_files[str(path)] = {
                        "industry": industry_name,
                        "match_type": "contextual"
                    }

    evidence = []
    errors = []

    for file_path, match in selected_files.items():
        path = Path(file_path)
        records, columns, error = read_dataset(path)

        if error:
            errors.append({
                "dataset": path.name,
                "error": error
            })
            continue

        if not records:
            continue

        periods = [
            row.get("time_period")
            for row in records
            if row.get("time_period")
        ]

        evidence.append({
            "dataset": path.name,
            "matched_industry": match["industry"],
            "evidence_type": match["match_type"],
            "record_count": len(records),
            "latest_period": max(periods) if periods else None,
            "columns": columns,
            "observations": extract_observations(
                records, columns
            ),
            "source": "RBI DBIE dataset",
            "source_verified": False,
            "limitations": [
                "Contextual economic data, not direct customer demand.",
                "Dataset dimensions and category codes need interpretation.",
                "Values must be interpreted using their units and periods.",
                "This dataset does not independently prove startup success."
            ]
        })

    world_bank_evidence, world_bank_errors = collect_world_bank_evidence(root, industries)
    evidence.extend(world_bank_evidence)
    errors.extend(world_bank_errors)

    return {
        "geography": "India",
        "detected_industries": industries,
        "datasets_matched": len(evidence),
        "direct_market_evidence_found": False,
        "evidence_sources": sorted({item.get("source", "Unknown") for item in evidence}),
        "world_bank_datasets_matched": len(world_bank_evidence),
        "contextual_datasets": evidence,
        "dataset_errors": errors,
        "not_found_topics": [
            "Direct customer demand",
            "Startup-specific market size",
            "Customer willingness to pay",
            "Competitor market share"
        ],
        "evidence_note": ("If no sector-specific indicator is available, the system still returns "
            "broad India-level context where downloaded general indicators exist. Missing direct-market "
            "metrics are identified as evidence gaps, not as a missing dataset error."),
        "scoring_recommendation": (
            "Do not increase or decrease the startup score "
            "using these contextual datasets alone."
        ),
        "warning": (
            "RBI and World Bank datasets provide contextual indicators. They do not "
            "independently establish customer demand, willingness to pay, or market size."
        )
    }