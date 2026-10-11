"""
Data Quality & Validation Engine
Evaluates datasets against 11 comprehensive enterprise rules with an explainable scoring formula.
Maintains quarantine tracking and corrective action recommendations.
"""
from pathlib import Path
import csv
import json
import re
from datetime import datetime
from typing import Dict, Any, List
import config

DATE_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}$")

class QualityEngine:
    def __init__(self, run_id: str):
        self.run_id = run_id
        self.results_file = config.STORAGE_DIR / f"quality_evaluation_{run_id}.json"
        self.results_latest = config.STORAGE_DIR / "quality_evaluation_latest.json"

    def evaluate(self, bronze_path: Path, silver_path: Path) -> Dict[str, Any]:
        start_time = datetime.utcnow()
        
        # Read Bronze records
        bronze_rows = []
        if bronze_path.exists():
            with open(bronze_path, mode="r", encoding="utf-8") as f:
                bronze_rows = list(csv.DictReader(f))
                
        # Read Silver records
        silver_rows = []
        if silver_path.exists():
            with open(silver_path, mode="r", encoding="utf-8") as f:
                silver_rows = list(csv.DictReader(f))

        total_bronze = len(bronze_rows)
        total_silver = len(silver_rows)
        
        checks: List[Dict[str, Any]] = []

        # Check 1: Schema Integrity & Required Column Coverage
        bronze_cols = list(bronze_rows[0].keys()) if bronze_rows else []
        missing_expected = [c for c in config.EXPECTED_COLUMNS if c not in bronze_cols]
        schema_passed = len(missing_expected) == 0
        checks.append({
            "check_id": "CHK_01_SCHEMA_MATCH",
            "name": "Schema Structure & Column Presence",
            "category": "Schema",
            "weight": 10,
            "status": "PASSED" if schema_passed else "FAILED",
            "description": "Verifies all required medallion columns exist in source payload.",
            "actual_value": f"{len(bronze_cols) - len(missing_expected)}/{len(config.EXPECTED_COLUMNS)} columns present",
            "failed_count": len(missing_expected),
            "remediation": "Update ingestion mapping or add schema evolution step for missing fields." if not schema_passed else "None"
        })

        # Check 2: Primary Key Null & Completeness Rate (order_id)
        null_order_ids = sum(1 for r in bronze_rows if not r.get("order_id", "").strip())
        null_pk_passed = null_order_ids == 0
        checks.append({
            "check_id": "CHK_02_PRIMARY_KEY_NULLS",
            "name": "Primary Key Completeness (order_id)",
            "category": "Completeness",
            "weight": 10,
            "status": "PASSED" if null_pk_passed else "FAILED",
            "description": "Ensures every record carries a mandatory non-null order identifier.",
            "actual_value": f"{null_order_ids} null IDs detected",
            "failed_count": null_order_ids,
            "remediation": "Quarantine rows without primary key and alert upstream ingestion source." if not null_pk_passed else "None"
        })

        # Check 3: Duplicate Order Records
        seen_ids = set()
        duplicate_orders = 0
        for r in bronze_rows:
            oid = r.get("order_id", "").strip()
            if oid:
                if oid in seen_ids:
                    duplicate_orders += 1
                seen_ids.add(oid)
        dup_passed = duplicate_orders == 0
        checks.append({
            "check_id": "CHK_03_DUPLICATE_RECORDS",
            "name": "Record Uniqueness & Deduplication",
            "category": "Uniqueness",
            "weight": 10,
            "status": "PASSED" if dup_passed else ("WARNING" if duplicate_orders <= 2 else "FAILED"),
            "description": "Validates there are no redundant transactions with identical order IDs.",
            "actual_value": f"{duplicate_orders} duplicate occurrences",
            "failed_count": duplicate_orders,
            "remediation": "Apply idempotent deduplication windowing in Silver transformation layer." if not dup_passed else "None"
        })

        # Check 4: Data Type Conformity (unit_price numeric float)
        invalid_prices = 0
        for r in bronze_rows:
            p = r.get("unit_price", "")
            try:
                float(p)
            except (ValueError, TypeError):
                invalid_prices += 1
        type_passed = invalid_prices == 0
        checks.append({
            "check_id": "CHK_04_DATA_TYPE_CONFORMITY",
            "name": "Data Type Conformity (unit_price)",
            "category": "Validity",
            "weight": 8,
            "status": "PASSED" if type_passed else "FAILED",
            "description": "Verifies unit prices are parseable as floating point decimals.",
            "actual_value": f"{invalid_prices} unparseable values",
            "failed_count": invalid_prices,
            "remediation": "Sanitize string currency symbols or non-numeric characters before casting." if not type_passed else "None"
        })

        # Check 5: Range & Non-Negativity Constraints (quantity > 0, price > 0)
        out_of_range = 0
        for r in bronze_rows:
            try:
                qty = int(r.get("quantity", "0"))
                price = float(r.get("unit_price", "0"))
                if qty <= 0 or price <= 0:
                    out_of_range += 1
            except Exception:
                out_of_range += 1
        range_passed = out_of_range == 0
        checks.append({
            "check_id": "CHK_05_OUT_OF_RANGE_VALUES",
            "name": "Numerical Range Boundaries (qty & price > 0)",
            "category": "Validity",
            "weight": 10,
            "status": "PASSED" if range_passed else "WARNING",
            "description": "Protects analytical models against negative orders or return anomalies.",
            "actual_value": f"{out_of_range} records out-of-bounds",
            "failed_count": out_of_range,
            "remediation": "Route negative transactions to a specialized returns/reversal dataset." if not range_passed else "None"
        })

        # Check 6: Valid Date Format & Chronology (order_date)
        invalid_dates = 0
        for r in bronze_rows:
            d = r.get("order_date", "").strip()
            if not DATE_REGEX.match(d):
                invalid_dates += 1
            else:
                try:
                    datetime.strptime(d, "%Y-%m-%d")
                except ValueError:
                    invalid_dates += 1
        dates_passed = invalid_dates == 0
        checks.append({
            "check_id": "CHK_06_DATE_FORMAT_INTEGRITY",
            "name": "Temporal Format & Validity (ISO-8601)",
            "category": "Validity",
            "weight": 8,
            "status": "PASSED" if dates_passed else "WARNING",
            "description": "Verifies all transaction timestamps adhere to ISO-8601 YYYY-MM-DD standard.",
            "actual_value": f"{invalid_dates} invalid date records",
            "failed_count": invalid_dates,
            "remediation": "Use robust date-time fuzzy parser with fallback to ingestion timestamp." if not dates_passed else "None"
        })

        # Check 7: Missing Value Rates (customer_email)
        missing_emails = sum(1 for r in bronze_rows if not r.get("customer_email", "").strip())
        missing_email_rate = round((missing_emails / total_bronze) * 100, 1) if total_bronze else 0
        email_status = "PASSED" if missing_emails == 0 else ("WARNING" if missing_email_rate < 15 else "FAILED")
        checks.append({
            "check_id": "CHK_07_NULL_VALUE_RATES",
            "name": "Field Completeness (customer_email)",
            "category": "Completeness",
            "weight": 6,
            "status": email_status,
            "description": "Tracks missing contact information affecting customer master resolution.",
            "actual_value": f"{missing_emails} missing ({missing_email_rate}%)",
            "failed_count": missing_emails,
            "remediation": "Impute synthetic customer identifier or join with master CRM directory." if missing_emails > 0 else "None"
        })

        # Check 8: Business Rule Validation (discount_rate between 0.0 and 1.0)
        invalid_discounts = 0
        for r in bronze_rows:
            try:
                disc = float(r.get("discount_rate", "0"))
                if disc < 0.0 or disc > 1.0:
                    invalid_discounts += 1
            except Exception:
                invalid_discounts += 1
        disc_passed = invalid_discounts == 0
        checks.append({
            "check_id": "CHK_08_BUSINESS_RULES",
            "name": "Discount Rate Policy (0% - 100%)",
            "category": "Business Rule",
            "weight": 8,
            "status": "PASSED" if disc_passed else "WARNING",
            "description": "Verifies applied promotional discount percentages stay within operational caps.",
            "actual_value": f"{invalid_discounts} invalid discounts",
            "failed_count": invalid_discounts,
            "remediation": "Cap discount values at 1.0 (100%) and flag unauthorized promotion codes." if not disc_passed else "None"
        })

        # Check 9: Referential & Domain Integrity (customer_region in ALLOWED_REGIONS)
        invalid_regions = 0
        for r in bronze_rows:
            reg = r.get("customer_region", "").strip()
            if reg not in config.ALLOWED_REGIONS:
                invalid_regions += 1
        reg_passed = invalid_regions == 0
        checks.append({
            "check_id": "CHK_09_DOMAIN_INTEGRITY",
            "name": "Geographic Domain Conformance",
            "category": "Consistency",
            "weight": 8,
            "status": "PASSED" if reg_passed else "WARNING",
            "description": "Ensures delivery territories match sanctioned international corporate regions.",
            "actual_value": f"{invalid_regions} unassigned territories",
            "failed_count": invalid_regions,
            "remediation": "Map unassigned territories to standard geo-hierarchy lookup table." if not reg_passed else "None"
        })

        # Check 10: Data Freshness & Ingestion Latency
        # Checks if ingestion timestamp was captured
        has_ingestion_ts = all("_ingestion_timestamp" in r for r in bronze_rows) if bronze_rows else False
        checks.append({
            "check_id": "CHK_10_DATA_FRESHNESS",
            "name": "Audit Lineage & Freshness Metadata",
            "category": "Freshness",
            "weight": 6,
            "status": "PASSED" if has_ingestion_ts else "WARNING",
            "description": "Confirms every incoming row was stamped with verifiable pipeline ingestion time.",
            "actual_value": "Ingestion audit stamps verified" if has_ingestion_ts else "Missing ingestion timestamp",
            "failed_count": 0 if has_ingestion_ts else total_bronze,
            "remediation": "Enforce bronze metadata decorator at file ingest." if not has_ingestion_ts else "None"
        })

        # Check 11: Medallion Row Drift & Drop Rate (Bronze vs Silver)
        drop_count = total_bronze - total_silver
        drop_rate_pct = round((drop_count / total_bronze) * 100, 1) if total_bronze else 0.0
        drift_status = "PASSED" if drop_rate_pct < 10 else ("WARNING" if drop_rate_pct < 25 else "FAILED")
        checks.append({
            "check_id": "CHK_11_ROW_COUNT_DRIFT",
            "name": "Medallion Promotion & Quarantine Rate",
            "category": "Integrity",
            "weight": 14,
            "status": drift_status,
            "description": "Quantifies proportion of raw input promoted to Silver vs quarantined for defects.",
            "actual_value": f"{total_silver}/{total_bronze} promoted ({drop_rate_pct}% quarantined)",
            "failed_count": drop_count,
            "remediation": "Inspect quarantine logs to triage high defect volumes." if drop_rate_pct >= 10 else "None"
        })

        # Calculate Explainable Composite Score:
        # Score = Sum(check.weight * multiplier) / Total_Weight * 100
        # multiplier: PASSED = 1.0, WARNING = 0.6, FAILED = 0.0
        total_weight = sum(c["weight"] for c in checks)
        earned_weight = 0.0
        passed_count = 0
        warning_count = 0
        failed_count = 0

        for c in checks:
            if c["status"] == "PASSED":
                earned_weight += c["weight"] * 1.0
                passed_count += 1
            elif c["status"] == "WARNING":
                earned_weight += c["weight"] * 0.6
                warning_count += 1
            else:
                failed_count += 1

        overall_score = round((earned_weight / total_weight) * 100, 1) if total_weight else 0.0
        
        evaluation = {
            "run_id": self.run_id,
            "evaluated_at": datetime.utcnow().isoformat(),
            "duration_seconds": (datetime.utcnow() - start_time).total_seconds(),
            "overall_score": overall_score,
            "score_formula": "QualityScore = Sum(Weight_i * Multiplier_i) / Sum(Weight_i) * 100 [Pass: 1.0, Warn: 0.6, Fail: 0.0]",
            "status": "PASSED" if overall_score >= config.QUALITY_PASS_THRESHOLD else ("WARNING" if overall_score >= config.QUALITY_WARN_THRESHOLD else "FAILED"),
            "total_checks": len(checks),
            "passed_checks": passed_count,
            "warning_checks": warning_count,
            "failed_checks": failed_count,
            "total_records_evaluated": total_bronze,
            "quarantined_records_count": drop_count,
            "checks": checks
        }

        with open(self.results_file, mode="w", encoding="utf-8") as f_out:
            json.dump(evaluation, f_out, indent=2)

        with open(self.results_latest, mode="w", encoding="utf-8") as f_latest:
            json.dump(evaluation, f_latest, indent=2)

        return evaluation
