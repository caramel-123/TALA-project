#!/usr/bin/env python3
"""Generate synthetic CSV files for Data Manager demo uploads."""

import argparse
import csv
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

REGIONS = [
    ("130000000", "NCR"),
    ("040000000", "Region IV-A"),
    ("120000000", "Region XII"),
    ("190000000", "BARMM"),
]

SPECIALIZATIONS = [
    "Mathematics",
    "Science",
    "Languages",
    "General Education",
    "ICT",
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
    return d.strftime("%Y-%m-%d")


def write_csv(path, rows, fieldnames):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def generate_teachers(n):
    rows = []
    for i in range(1, n + 1):
        region_code, region_name = random.choice(REGIONS)
        teacher_id = f"TCH-{i:06d}"
        issue_marker = random.choices(
            ISSUE_MARKERS, weights=[80, 5, 4, 5, 4, 2], k=1
        )[0]

        row = {
            "teacher_external_id": teacher_id,
            "teacher_name": f"Teacher {i}",
            "region_code": region_code,
            "region_name": region_name,
            "division_code": f"DIV-{random.randint(1, 20):03d}",
            "school_id_code": f"SCH-{random.randint(1, 200):05d}",
            "specialization": random.choice(SPECIALIZATIONS),
            "years_experience": random.randint(0, 35),
            "training_hours_last_12m": random.randint(0, 120),
            "submitted_at": rand_date(),
            "issue_marker": issue_marker,
        }

        if issue_marker == "missing_field":
            row["specialization"] = ""
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
        region_code, region_name = random.choice(REGIONS)
        rows.append(
            {
                "attendance_id": f"ATT-{i:06d}",
                "teacher_external_id": f"TCH-{random.randint(1, n):06d}",
                "program_name": random.choice(programs),
                "session_date": rand_date(180),
                "hours": random.randint(1, 16),
                "region_code": region_code,
                "region_name": region_name,
            }
        )
    return rows


def generate_infrastructure(n):
    rows = []
    for i in range(1, n + 1):
        region_code, region_name = random.choice(REGIONS)
        rows.append(
            {
                "survey_id": f"INF-{i:06d}",
                "school_id_code": f"SCH-{random.randint(1, 200):05d}",
                "region_code": region_code,
                "region_name": region_name,
                "has_science_lab": random.choice([0, 1]),
                "has_internet": random.choice([0, 1]),
                "classroom_condition_score": random.randint(40, 100),
                "submitted_at": rand_date(90),
            }
        )
    return rows


def generate_remote_classification(n):
    rows = []
    for i in range(1, n + 1):
        region_code, region_name = random.choice(REGIONS)
        rows.append(
            {
                "geo_id": f"GEO-{i:06d}",
                "school_id_code": f"SCH-{random.randint(1, 200):05d}",
                "region_code": region_code,
                "region_name": region_name,
                "is_remote": random.choice([0, 1]),
                "travel_time_minutes": random.randint(10, 360),
                "road_access_score": random.randint(1, 5),
                "updated_at": rand_date(365),
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
