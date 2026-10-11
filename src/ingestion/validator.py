"""
Ingestion Validation Module
Validates source CSV and JSON datasets prior to raw persistence.
"""
from pathlib import Path
import csv
import json
from typing import Dict, Any, List, Tuple
import config

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB demo limit
ALLOWED_EXTENSIONS = {".csv", ".json"}

class IngestionValidator:
    def __init__(self, file_path: Path):
        self.file_path = Path(file_path)

    def validate_file(self) -> Tuple[bool, List[str], Dict[str, Any]]:
        errors = []
        metadata = {
            "filename": self.file_path.name,
            "exists": self.file_path.exists(),
            "size_bytes": 0,
            "format": self.file_path.suffix.lower(),
            "row_count": 0,
            "detected_columns": []
        }

        if not self.file_path.exists():
            errors.append(f"Source file does not exist: {self.file_path}")
            return False, errors, metadata

        metadata["size_bytes"] = self.file_path.stat().st_size

        if metadata["size_bytes"] > MAX_FILE_SIZE_BYTES:
            errors.append(f"File size exceeds maximum allowed ({metadata['size_bytes']} > {MAX_FILE_SIZE_BYTES} bytes)")

        if metadata["format"] not in ALLOWED_EXTENSIONS:
            errors.append(f"Unsupported file format: {metadata['format']}. Allowed formats: {ALLOWED_EXTENSIONS}")
            return False, errors, metadata

        # Read sample to detect header and row count
        try:
            if metadata["format"] == ".csv":
                with open(self.file_path, mode="r", encoding="utf-8-sig") as f:
                    reader = csv.reader(f)
                    header = next(reader, None)
                    if not header:
                        errors.append("CSV file is empty or missing headers.")
                        return False, errors, metadata
                    
                    cleaned_header = [col.strip().lower() for col in header]
                    metadata["detected_columns"] = cleaned_header
                    
                    rows = list(reader)
                    metadata["row_count"] = len(rows)
                    
                    # Check column overlap
                    missing = [c for c in config.EXPECTED_COLUMNS if c not in cleaned_header]
                    if missing:
                        errors.append(f"Missing expected schema columns: {', '.join(missing)}")
            elif metadata["format"] == ".json":
                with open(self.file_path, mode="r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        metadata["row_count"] = len(data)
                        if len(data) > 0 and isinstance(data[0], dict):
                            metadata["detected_columns"] = list(data[0].keys())
                    else:
                        errors.append("JSON root element must be a list of records.")
        except Exception as e:
            errors.append(f"Failed to parse source file: {str(e)}")

        is_valid = len(errors) == 0
        return is_valid, errors, metadata
