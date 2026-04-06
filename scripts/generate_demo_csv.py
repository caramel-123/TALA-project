#!/usr/bin/env python3
"""Generate synthetic CSV files for Data Manager demo uploads."""

import argparse
import csv
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

REGIONS = [
    ("130000000", "NCR", ["NCR", "National Capital Region", "Metro Manila"]),
    ("040000000", "Region IV-A", ["Region IV-A", "CALABARZON", "Calabarzon"]),
    ("120000000", "Region XII", ["Region XII", "SOCCSKSARGEN", "Region 12"]),
    ("190000000", "BARMM", ["BARMM", "Bangsamoro", "Bangsamoro Autonomous Region"]),
]

SPECIALIZATION_VARIANTS = {
    "science": ["Sci", "Science", "General Science"],
    "mathematics": ["Math", "Mathematics", "Gen Math"],
    "languages": ["Language Arts", "Languages", "English"],
    "general_education": ["General Education", "Gen Ed", "Elementary Generalist"],
    "ict": ["ICT", "Information Technology", "Comp Tech"],
}

BOOLEAN_VARIANTS_TRUE = ["yes", "Yes", "Y"]
BOOLEAN_VARIANTS_FALSE = ["no", "No", "N"]

DATE_FORMATS = [
    "%Y-%m-%d",
    "%m/%d/%Y",
    "%d-%b-%Y",
    "%b %d, %Y",
    "%Y/%m/%d",
]

ISSUE_MARKERS = [
    "ok",
    "missing_field",
    "duplicate",
    "format_mismatch",
    "out_of_range",
    "provenance_conflict",
]


def rand_date(days_back=120):
    d = datetime.now(timezone.utc) - timedelta(days=random.randint(0, days_back))
    return d.strftime(random.choice(DATE_FORMATS))


def maybe_missing(value, probability=0.08):
    if random.random() < probability:
        return ""
    return value


def pick_region_values():
    region_code, canonical_region, aliases = random.choice(REGIONS)
    return region_code, canonical_region, random.choice(aliases)


def pick_specialization_variant():
    bucket = random.choice(list(SPECIALIZATION_VARIANTS.keys()))
    return random.choice(SPECIALIZATION_VARIANTS[bucket])


def pick_boolean_variant():
    return random.choice(BOOLEAN_VARIANTS_TRUE + BOOLEAN_VARIANTS_FALSE)


def write_csv(path, rows, fieldnames):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def generate_teachers(n):
    rows = []
    for i in range(1, n + 1):
        region_code, canonical_region, region_variant = pick_region_values()
        teacher_id = f"TCH-{i:06d}"
        issue_marker = random.choices(
            ISSUE_MARKERS, weights=[80, 5, 4, 5, 4, 2], k=1
        )[0]

        row = {
            "teacher_external_id": teacher_id,
            "teacher_name": maybe_missing(f"Teacher {i}", 0.03),
            "region_code": maybe_missing(region_code, 0.02),
            "region_name": maybe_missing(region_variant, 0.03),
            "canonical_region": canonical_region,
            "division_code": f"DIV-{random.randint(1, 20):03d}",
            "school_id_code": f"SCH-{random.randint(1, 200):05d}",
            "specialization": maybe_missing(pick_specialization_variant(), 0.08),
            "years_experience": maybe_missing(random.randint(0, 35), 0.05),
            "training_hours_last_12m": maybe_missing(random.randint(0, 120), 0.05),
            "consent_flag": maybe_missing(pick_boolean_variant(), 0.06),
            "submitted_at": maybe_missing(rand_date(), 0.04),
            "issue_marker": issue_marker,
        }

        if issue_marker == "missing_field":
            row[random.choice(["specialization", "teacher_name", "region_name"])] = ""
        elif issue_marker == "format_mismatch":
            row["years_experience"] = "ten"
        elif issue_marker == "out_of_range":
            row["training_hours_last_12m"] = 400

        rows.append(row)

        if issue_marker == "duplicate":
            rows.append(dict(row))

    return rows


def generate_training(n):
    rows = []
    programs = [
        "Math Problem Solving",
        "Science Inquiry",
        "Assessment",
        "Language Strategies",
    ]
    for i in range(1, n + 1):
        region_code, canonical_region, region_variant = pick_region_values()
        rows.append(
            {
                "attendance_id": f"ATT-{i:06d}",
                "teacher_external_id": f"TCH-{random.randint(1, n):06d}",
                "program_name": random.choice(programs),
                "session_date": maybe_missing(rand_date(180), 0.05),
                "hours": maybe_missing(random.randint(1, 16), 0.05),
                "specialization_reported": maybe_missing(pick_specialization_variant(), 0.09),
                "attended": maybe_missing(pick_boolean_variant(), 0.05),
                "region_code": maybe_missing(region_code, 0.02),
                "region_name": maybe_missing(region_variant, 0.03),
                "canonical_region": canonical_region,
            }
        )
    return rows


def generate_infrastructure(n):
    rows = []
    for i in range(1, n + 1):
        region_code, canonical_region, region_variant = pick_region_values()
        rows.append(
            {
                "survey_id": f"INF-{i:06d}",
                "school_id_code": f"SCH-{random.randint(1, 200):05d}",
                "region_code": maybe_missing(region_code, 0.03),
                "region_name": maybe_missing(region_variant, 0.04),
                "canonical_region": canonical_region,
                "has_science_lab": maybe_missing(pick_boolean_variant(), 0.08),
                "has_internet": maybe_missing(pick_boolean_variant(), 0.08),
                "classroom_condition_score": maybe_missing(random.randint(40, 100), 0.05),
                "submitted_at": maybe_missing(rand_date(90), 0.05),
            }
        )
    return rows


def generate_remote_classification(n):
    rows = []
    for i in range(1, n + 1):
        region_code, canonical_region, region_variant = pick_region_values()
        rows.append(
            {
                "geo_id": f"GEO-{i:06d}",
                "school_id_code": f"SCH-{random.randint(1, 200):05d}",
                "region_code": maybe_missing(region_code, 0.03),
                "region_name": maybe_missing(region_variant, 0.05),
                "canonical_region": canonical_region,
                "is_remote": maybe_missing(pick_boolean_variant(), 0.06),
                "travel_time_minutes": maybe_missing(random.randint(10, 360), 0.04),
                "road_access_score": maybe_missing(random.randint(1, 5), 0.04),
                "updated_at": maybe_missing(rand_date(365), 0.04),
            }
        )
    return rows


def main():
    parser = argparse.ArgumentParser(
        description="Generate synthetic CSVs for TALA Data Manager demo uploads"
    )
    parser.add_argument("--out", default="demo_uploads", help="Output directory")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--teachers", type=int, default=1000, help="Teacher rows")
    parser.add_argument("--training", type=int, default=500, help="Training rows")
    parser.add_argument("--infra", type=int, default=300, help="Infrastructure rows")
    parser.add_argument("--geo", type=int, default=200, help="Remote classification rows")
    args = parser.parse_args()

    random.seed(args.seed)
    out = Path(args.out)

    teacher_rows = generate_teachers(args.teachers)
    training_rows = generate_training(args.training)
    infra_rows = generate_infrastructure(args.infra)
    geo_rows = generate_remote_classification(args.geo)

    write_csv(out / "teacher_records.csv", teacher_rows, list(teacher_rows[0].keys()))
    write_csv(out / "training_attendance.csv", training_rows, list(training_rows[0].keys()))
    write_csv(out / "school_infrastructure.csv", infra_rows, list(infra_rows[0].keys()))
    write_csv(out / "remote_area_classification.csv", geo_rows, list(geo_rows[0].keys()))

    print(f"Generated CSV files in {out.resolve()}")


if __name__ == "__main__":
    main()
