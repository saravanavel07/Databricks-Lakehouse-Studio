"""
SQL Analytics Engine
Provides in-memory SQLite querying against Medallion Bronze, Silver, and Gold datasets.
Enforces read-only safety, captures query timing, and provides execution explanations.
"""
import sqlite3
import csv
import time
import re
from pathlib import Path
from typing import Dict, Any, List, Tuple
import config

FORBIDDEN_KEYWORDS = re.compile(r"\b(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE|ATTACH|DETACH|VACUUM|REINDEX)\b", re.IGNORECASE)

class SQLEngine:
    def __init__(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self._load_datasets()

    def _load_datasets(self) -> None:
        """Loads latest Bronze, Silver, and Gold CSVs as queryable SQLite tables."""
        tables_to_load = [
            ("bronze_sales", config.BRONZE_DIR / "bronze_sales_latest.csv"),
            ("silver_sales", config.SILVER_DIR / "silver_sales_latest.csv"),
            ("gold_daily_revenue", config.GOLD_DIR / "gold_daily_revenue_latest.csv"),
            ("gold_product_performance", config.GOLD_DIR / "gold_product_performance_latest.csv"),
            ("gold_regional_performance", config.GOLD_DIR / "gold_regional_performance_latest.csv"),
            ("gold_customer_segments", config.GOLD_DIR / "gold_customer_segments_latest.csv")
        ]

        for table_name, csv_path in tables_to_load:
            if not csv_path.exists():
                continue
            try:
                with open(csv_path, mode="r", encoding="utf-8") as f:
                    reader = csv.reader(f)
                    header = next(reader, None)
                    if not header:
                        continue
                    
                    # Sanitize column names for SQLite
                    safe_cols = [c.strip().replace(" ", "_").replace("-", "_") for c in header]
                    col_defs = ", ".join([f'"{c}" TEXT' for c in safe_cols])
                    
                    self.conn.execute(f'CREATE TABLE IF NOT EXISTS "{table_name}" ({col_defs})')
                    
                    rows = list(reader)
                    if rows:
                        placeholders = ", ".join(["?"] * len(safe_cols))
                        self.conn.executemany(f'INSERT INTO "{table_name}" VALUES ({placeholders})', rows)
            except Exception as e:
                print(f"Failed to load table {table_name}: {e}")

    def execute_query(self, query: str) -> Dict[str, Any]:
        """Safely executes a SELECT query and returns rows, execution time, and column headers."""
        query_clean = query.strip()
        
        # Enforce read-only constraint
        if FORBIDDEN_KEYWORDS.search(query_clean):
            return {
                "success": False,
                "error": "Security policy violation: Only read-only SELECT queries are permitted in the analytics workspace.",
                "duration_ms": 0.0,
                "row_count": 0,
                "columns": [],
                "rows": []
            }

        if not query_clean.lower().startswith("select") and not query_clean.lower().startswith("explain"):
            return {
                "success": False,
                "error": "Query must start with SELECT or EXPLAIN.",
                "duration_ms": 0.0,
                "row_count": 0,
                "columns": [],
                "rows": []
            }

        t0 = time.time()
        try:
            cursor = self.conn.cursor()
            cursor.execute(query_clean)
            rows = cursor.fetchall()
            t1 = time.time()
            duration_ms = round((t1 - t0) * 1000, 2)
            
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            data = [dict(zip(columns, row)) for row in rows]

            return {
                "success": True,
                "error": None,
                "duration_ms": duration_ms,
                "row_count": len(data),
                "columns": columns,
                "rows": data
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "duration_ms": round((time.time() - t0) * 1000, 2),
                "row_count": 0,
                "columns": [],
                "rows": []
            }

    def explain_query(self, query: str) -> str:
        """Explains the query execution plan."""
        try:
            cursor = self.conn.cursor()
            cursor.execute(f"EXPLAIN QUERY PLAN {query}")
            plans = cursor.fetchall()
            return "\n".join([f"Step {p[0]}: {p[3]}" for p in plans])
        except Exception as e:
            return f"Unable to explain query: {str(e)}"
