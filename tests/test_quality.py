"""Unit tests for Data Quality Engine."""
import unittest
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

import config
from src.quality.engine import QualityEngine

class TestQuality(unittest.TestCase):
    def test_quality_evaluation_rules(self):
        bronze_path = config.BRONZE_DIR / "bronze_sales_latest.csv"
        silver_path = config.SILVER_DIR / "silver_sales_latest.csv"

        engine = QualityEngine(run_id="test_quality_01")
        eval_result = engine.evaluate(bronze_path, silver_path)

        self.assertIn("overall_score", eval_result)
        self.assertGreater(eval_result["overall_score"], 0)
        self.assertEqual(eval_result["total_checks"], 11)
        self.assertIn(eval_result["status"], ["PASSED", "WARNING", "FAILED"])

        # Verify check categories exist
        categories = {c["category"] for c in eval_result["checks"]}
        self.assertIn("Schema", categories)
        self.assertIn("Completeness", categories)
        self.assertIn("Uniqueness", categories)
        self.assertIn("Validity", categories)

if __name__ == "__main__":
    unittest.main()
