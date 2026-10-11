"""
Bronze Layer Processor
Preserves raw source records faithfully with audit metadata and schema snapshots.
Never silently discards invalid rows: captures raw payload and quarantine records.
"""
from pathlib import Path
import csv
import json
import hashlib
from datetime import datetime
from typing import Dict, Any, List, Tuple
import config

class BronzeProcessor:
    def __init__(self, run_id: str):
        self.run_id = run_id
        self.bronze_output_file = config.BRONZE_DIR / f"bronze_sales_{run_id}.csv"
        self.bronze_latest_file = config.BRONZE_DIR / "bronze_sales_latest.csv"
        self.schema_snapshot_file = config.BRONZE_DIR / "schema_snapshot_latest.json"

    def process(self, source_path: Path) -> Dict[str, Any]:
        """Ingests source data into raw Bronze layer with tracking metadata."""
        start_time = datetime.utcnow()
        raw_records: List[Dict[str, Any]] = []
        quarantined_records: List[Dict[str, Any]] = []
        
        with open(source_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames or []
            
            for row_idx, row in enumerate(reader, start=1):
                clean_row = {k.strip(): v.strip() if isinstance(v, str) else v for k, v in row.items()}
                
                # Check for completely empty rows
                if not any(clean_row.values()):
                    quarantined_records.append({
                        "row_index": row_idx,
                        "reasons": ["Empty raw record"],
                        "raw_payload": clean_row
                    })
                    continue
                
                # Calculate deterministic record hash
                payload_str = json.dumps(clean_row, sort_keys=True)
                record_hash = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()[:16]
                
                enriched_row = dict(clean_row)
                enriched_row["_ingestion_timestamp"] = start_time.isoformat()
                enriched_row["_source_file"] = source_path.name
                enriched_row["_record_hash"] = record_hash
                enriched_row["_bronze_run_id"] = self.run_id
                enriched_row["_row_number"] = row_idx
                
                raw_records.append(enriched_row)

        # Write to Bronze CSV
        if raw_records:
            bronze_fields = list(raw_records[0].keys())
            with open(self.bronze_output_file, mode="w", newline="", encoding="utf-8") as f_out:
                writer = csv.DictWriter(f_out, fieldnames=bronze_fields)
                writer.writeheader()
                writer.writerows(raw_records)
                
            # Copy to latest
            with open(self.bronze_latest_file, mode="w", newline="", encoding="utf-8") as f_latest:
                writer = csv.DictWriter(f_latest, fieldnames=bronze_fields)
                writer.writeheader()
                writer.writerows(raw_records)

        # Save Schema Snapshot
        schema_snapshot = {
            "snapshot_timestamp": start_time.isoformat(),
            "source_file": source_path.name,
            "column_count": len(fieldnames),
            "columns": fieldnames,
            "record_count": len(raw_records),
            "run_id": self.run_id
        }
        with open(self.schema_snapshot_file, mode="w", encoding="utf-8") as f_schema:
            json.dump(schema_snapshot, f_schema, indent=2)

        return {
            "status": "SUCCEEDED",
            "source_records_read": len(raw_records) + len(quarantined_records),
            "bronze_records_written": len(raw_records),
            "quarantined_records_count": len(quarantined_records),
            "bronze_path": str(self.bronze_output_file),
            "schema_columns": fieldnames,
            "duration_seconds": (datetime.utcnow() - start_time).total_seconds()
        }

    def read_latest(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Reads recent rows from Bronze layer for preview."""
        if not self.bronze_latest_file.exists():
            return []
        rows = []
        with open(self.bronze_latest_file, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for i, r in enumerate(reader):
                if i >= limit:
                    break
                rows.append(r)
        return rows
