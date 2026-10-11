"""Unit tests for Silver and Gold transformations."""
import unittest
from pathlib import Path
import tempfile
import csv
import sys

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

import config
from src.silver.cleaner import SilverCleaner
from src.gold.aggregator import GoldAggregator

class TestTransformations(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.bronze_file = Path(self.temp_dir.name) / "test_bronze.csv"

        with open(self.bronze_file, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "order_id", "order_date", "customer_id", "customer_name", "customer_email",
                "customer_region", "product_id", "product_category", "product_name",
                "unit_price", "quantity", "discount_rate", "shipping_fee", "payment_method",
                "order_status", "_ingestion_timestamp", "_source_file", "_record_hash"
            ])
            # Valid row
            writer.writerow([
                "ORD-1", "2026-03-01", "C-1", "Alice", "alice@example.com",
                "North America", "P-1", "Electronics", "Laptop", "1000.00", "2",
                "0.10", "15.00", "Credit Card", "DELIVERED", "2026-03-01T00:00:00", "file.csv", "hash1"
            ])
            # Duplicate row with same ORD-1
            writer.writerow([
                "ORD-1", "2026-03-01", "C-1", "Alice", "alice@example.com",
                "North America", "P-1", "Electronics", "Laptop", "1000.00", "2",
                "0.10", "15.00", "Credit Card", "DELIVERED", "2026-03-01T00:00:00", "file.csv", "hash2"
            ])
            # Invalid negative quantity
            writer.writerow([
                "ORD-2", "2026-03-02", "C-2", "Bob", "bob@example.com",
                "Europe", "P-2", "Accessories", "Mouse", "50.00", "-1",
                "0.00", "5.00", "PayPal", "DELIVERED", "2026-03-02T00:00:00", "file.csv", "hash3"
            ])

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_silver_deduplication_and_quarantine(self):
        cleaner = SilverCleaner(run_id="test_silver_01")
        result = cleaner.process(self.bronze_file)

        self.assertEqual(result["input_bronze_count"], 3)
        self.assertEqual(result["output_silver_count"], 1) # Only 1 valid row
        self.assertEqual(result["duplicates_removed"], 1)
        self.assertEqual(result["quarantined_count"], 2) # 1 duplicate + 1 negative qty

    def test_gold_aggregation(self):
        cleaner = SilverCleaner(run_id="test_silver_02")
        cleaner.process(self.bronze_file)

        aggregator = GoldAggregator(run_id="test_gold_01")
        gold_result = aggregator.process(cleaner.silver_output_file)

        self.assertEqual(gold_result["status"], "SUCCEEDED")
        self.assertEqual(gold_result["daily_revenue_count"], 1)
        kpis = gold_result["kpis"]
        self.assertEqual(kpis["total_orders"], 1)
        self.assertEqual(kpis["total_gross_revenue"], 2000.00) # 1000 * 2
        # Net = gross (2000) - discount (200) + shipping (15) = 1815.00
        self.assertEqual(kpis["total_net_revenue"], 1815.00)

if __name__ == "__main__":
    unittest.main()
