"""Unit tests for SQL Security, RBAC, and PII Masking."""
import unittest
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from src.analytics.sql_engine import SQLEngine
from src.governance.catalog import mask_pii_email, check_table_access

class TestSecurity(unittest.TestCase):
    def test_sql_injection_and_forbidden_dml(self):
        engine = SQLEngine()
        
        # Test destructive statements blocked
        bad_queries = [
            "DROP TABLE bronze_sales;",
            "DELETE FROM silver_sales WHERE 1=1;",
            "INSERT INTO gold_daily_revenue VALUES ('2026-01-01', 1, 10, 10, 1, 10);",
            "UPDATE bronze_sales SET unit_price = 0;",
            "ALTER TABLE silver_sales ADD COLUMN hacker TEXT;"
        ]
        for q in bad_queries:
            result = engine.execute_query(q)
            self.assertFalse(result["success"])
            self.assertIn("Security policy violation", result["error"])

    def test_pii_masking(self):
        email = "saravanavel@example.com"
        masked = mask_pii_email(email)
        self.assertEqual(masked, "s***@example.com")
        self.assertNotIn("saravanavel", masked)

    def test_rbac_table_access_rules(self):
        # Analyst cannot access quarantine or audit
        analyst_check = check_table_access("DATA_ANALYST", "lakehouse_studio.quarantine.records")
        self.assertEqual(analyst_check["status"], "DENIED")

        # Engineer can access bronze
        eng_check = check_table_access("DATA_ENGINEER", "lakehouse_studio.bronze.bronze_sales")
        self.assertEqual(eng_check["status"], "ALLOWED")

if __name__ == "__main__":
    unittest.main()
