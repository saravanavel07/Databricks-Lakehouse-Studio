"""Unit tests for Ingestion and Bronze Layer."""
import unittest
from pathlib import Path
import tempfile
import csv
import sys

# Ensure root path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

import config
from src.ingestion.validator import IngestionValidator
from src.bronze.processor import BronzeProcessor

class TestIngestion(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.test_file = Path(self.temp_dir.name) / "test_sales.csv"
        
        with open(self.test_file, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(config.EXPECTED_COLUMNS)
            writer.writerow([
                "ORD-901", "2026-03-01", "CUST-1", "Test User", "test@test.com",
                "North America", "PROD-1", "Electronics", "Gadget", "100.00", "1",
                "0.00", "5.00", "Credit Card", "DELIVERED"
            ])

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_file_validation_valid(self):
        validator = IngestionValidator(self.test_file)
        is_valid, errors, meta = validator.validate_file()
        self.assertTrue(is_valid)
        self.assertEqual(len(errors), 0)
        self.assertEqual(meta["row_count"], 1)

    def test_file_validation_nonexistent(self):
        fake_path = Path(self.temp_dir.name) / "missing.csv"
        validator = IngestionValidator(fake_path)
        is_valid, errors, meta = validator.validate_file()
        self.assertFalse(is_valid)
        self.assertIn("does not exist", errors[0])

    def test_bronze_processor_hash_and_metadata(self):
        processor = BronzeProcessor(run_id="test_run_01")
        result = processor.process(self.test_file)
        self.assertEqual(result["status"], "SUCCEEDED")
        self.assertEqual(result["bronze_records_written"], 1)

        # Check latest rows for added bronze metadata
        latest = processor.read_latest()
        self.assertGreater(len(latest), 0)
        row = latest[0]
        self.assertIn("_ingestion_timestamp", row)
        self.assertIn("_record_hash", row)
        self.assertIn("_bronze_run_id", row)

if __name__ == "__main__":
    unittest.main()
