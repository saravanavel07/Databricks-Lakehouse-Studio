"""
Silver Layer Cleaner & Validator
Transforms raw Bronze data into cleansed, deduplicated, standardized, validated data.
Records quarantine rows with reasons and calculates before-and-after metrics.
"""
from pathlib import Path
import csv
import json
import re
from datetime import datetime
from typing import Dict, Any, List, Tuple
import config

DATE_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}$")

class SilverCleaner:
    def __init__(self, run_id: str):
        self.run_id = run_id
        self.silver_output_file = config.SILVER_DIR / f"silver_sales_{run_id}.csv"
        self.silver_latest_file = config.SILVER_DIR / "silver_sales_latest.csv"
        self.quarantine_output_file = config.QUARANTINE_DIR / f"quarantine_{run_id}.json"
        self.metrics_file = config.SILVER_DIR / f"silver_metrics_{run_id}.json"

    def process(self, bronze_file_path: Path) -> Dict[str, Any]:
        start_time = datetime.utcnow()
        cleaned_records: List[Dict[str, Any]] = []
        quarantined_records: List[Dict[str, Any]] = []
        transformation_logs: List[str] = []
        
        seen_order_ids = set()
        total_input_count = 0
        duplicate_count = 0
        invalid_type_count = 0
        missing_values_count = 0
        out_of_range_count = 0

        with open(bronze_file_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row_idx, raw_row in enumerate(reader, start=1):
                total_input_count += 1
                row_errors = []
                cleaned_row = {}

                # 1. Standardize column names (lowercase, stripped)
                standardized = {k.strip().lower(): v.strip() if isinstance(v, str) else v for k, v in raw_row.items()}
                
                order_id = standardized.get("order_id", "").strip()
                if not order_id:
                    row_errors.append("Missing primary key: order_id")
                elif order_id in seen_order_ids:
                    duplicate_count += 1
                    row_errors.append(f"Duplicate order_id detected: {order_id}")
                else:
                    seen_order_ids.add(order_id)
                cleaned_row["order_id"] = order_id

                # 2. Date parsing & validation
                raw_date = standardized.get("order_date", "").strip()
                if not raw_date or not DATE_REGEX.match(raw_date):
                    row_errors.append(f"Invalid date format for order_date: '{raw_date}' (expected YYYY-MM-DD)")
                    cleaned_row["order_date"] = None
                else:
                    try:
                        valid_dt = datetime.strptime(raw_date, "%Y-%m-%d")
                        cleaned_row["order_date"] = valid_dt.strftime("%Y-%m-%d")
                    except ValueError:
                        row_errors.append(f"Invalid date value: '{raw_date}'")
                        cleaned_row["order_date"] = None

                # 3. Customer validation
                cleaned_row["customer_id"] = standardized.get("customer_id", "").strip()
                cleaned_row["customer_name"] = standardized.get("customer_name", "").strip()
                
                email = standardized.get("customer_email", "").strip()
                cleaned_row["_email_missing"] = False
                cleaned_row["_email_invalid_format"] = False
                if not email:
                    missing_values_count += 1
                    cleaned_row["customer_email"] = "unknown@customer.local"
                    cleaned_row["_email_missing"] = True
                elif "@" not in email or "." not in email:
                    missing_values_count += 1
                    cleaned_row["customer_email"] = email
                    cleaned_row["_email_invalid_format"] = True
                else:
                    cleaned_row["customer_email"] = email

                region = standardized.get("customer_region", "").strip()
                if region not in config.ALLOWED_REGIONS:
                    region = "Other / Unassigned"
                cleaned_row["customer_region"] = region

                # 4. Product attributes
                cleaned_row["product_id"] = standardized.get("product_id", "").strip()
                cleaned_row["product_category"] = standardized.get("product_category", "General").strip()
                cleaned_row["product_name"] = standardized.get("product_name", "").strip()

                # 5. Numeric validations & conversions
                # Unit price
                raw_price = standardized.get("unit_price", "0")
                try:
                    price = float(raw_price)
                    if price <= 0:
                        out_of_range_count += 1
                        row_errors.append(f"Unit price must be positive, got {price}")
                    cleaned_row["unit_price"] = price
                except (ValueError, TypeError):
                    invalid_type_count += 1
                    row_errors.append(f"Invalid numeric value for unit_price: '{raw_price}'")
                    cleaned_row["unit_price"] = 0.0

                # Quantity
                raw_qty = standardized.get("quantity", "0")
                try:
                    qty = int(raw_qty)
                    if qty <= 0:
                        out_of_range_count += 1
                        row_errors.append(f"Quantity must be positive integer, got {qty}")
                    cleaned_row["quantity"] = qty
                except (ValueError, TypeError):
                    invalid_type_count += 1
                    row_errors.append(f"Invalid integer value for quantity: '{raw_qty}'")
                    cleaned_row["quantity"] = 0

                # Discount rate
                try:
                    cleaned_row["discount_rate"] = float(standardized.get("discount_rate", 0.0))
                except (ValueError, TypeError):
                    cleaned_row["discount_rate"] = 0.0

                # Shipping fee
                try:
                    cleaned_row["shipping_fee"] = float(standardized.get("shipping_fee", 0.0))
                except (ValueError, TypeError):
                    cleaned_row["shipping_fee"] = 0.0

                # Calculated line amount
                gross = round(cleaned_row["unit_price"] * cleaned_row["quantity"], 2)
                discount_amount = round(gross * cleaned_row["discount_rate"], 2)
                net = round(gross - discount_amount + cleaned_row["shipping_fee"], 2)
                cleaned_row["line_gross_amount"] = gross
                cleaned_row["line_discount_amount"] = discount_amount
                cleaned_row["line_net_amount"] = net

                # Order Status
                status = standardized.get("order_status", "PROCESSING").strip().upper()
                if status not in config.ALLOWED_STATUSES:
                    status = "PROCESSING"
                cleaned_row["order_status"] = status
                cleaned_row["payment_method"] = standardized.get("payment_method", "Other").strip()
                
                # Silver Audit Metadata
                cleaned_row["_silver_processed_at"] = datetime.utcnow().isoformat()
                cleaned_row["_silver_run_id"] = self.run_id

                # Quarantine check
                if row_errors:
                    quarantined_records.append({
                        "order_id": order_id or f"ROW_{row_idx}",
                        "row_number": row_idx,
                        "reasons": row_errors,
                        "raw_data": raw_row
                    })
                else:
                    cleaned_records.append(cleaned_row)

        transformation_logs.append(f"Processed {total_input_count} Bronze rows.")
        transformation_logs.append(f"Deduplicated {duplicate_count} duplicate order records.")
        transformation_logs.append(f"Quarantined {len(quarantined_records)} invalid rows.")
        transformation_logs.append(f"Promoted {len(cleaned_records)} cleansed records to Silver layer.")

        # Persist Silver dataset
        if cleaned_records:
            silver_fields = list(cleaned_records[0].keys())
            with open(self.silver_output_file, mode="w", newline="", encoding="utf-8") as f_out:
                writer = csv.DictWriter(f_out, fieldnames=silver_fields)
                writer.writeheader()
                writer.writerows(cleaned_records)

            with open(self.silver_latest_file, mode="w", newline="", encoding="utf-8") as f_latest:
                writer = csv.DictWriter(f_latest, fieldnames=silver_fields)
                writer.writeheader()
                writer.writerows(cleaned_records)

        # Persist Quarantine dataset
        with open(self.quarantine_output_file, mode="w", encoding="utf-8") as f_q:
            json.dump({
                "run_id": self.run_id,
                "quarantine_count": len(quarantined_records),
                "quarantined_items": quarantined_records
            }, f_q, indent=2)

        duration = (datetime.utcnow() - start_time).total_seconds()
        metrics = {
            "run_id": self.run_id,
            "input_bronze_count": total_input_count,
            "output_silver_count": len(cleaned_records),
            "quarantined_count": len(quarantined_records),
            "duplicates_removed": duplicate_count,
            "invalid_types_found": invalid_type_count,
            "missing_fields_flagged": missing_values_count,
            "out_of_range_errors": out_of_range_count,
            "duration_seconds": duration,
            "logs": transformation_logs
        }

        with open(self.metrics_file, mode="w", encoding="utf-8") as f_m:
            json.dump(metrics, f_m, indent=2)

        return metrics
