"""
CLI Pipeline Runner
Executes the full Medallion Lakehouse Pipeline end-to-end and outputs structured execution metrics.
"""
from pathlib import Path
import sys
import json

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

import config
from src.orchestration.engine import PipelineEngine

def main():
    print("=" * 70)
    print("LAKEHOUSE STUDIO — MEDALLION PIPELINE EXECUTION")
    print("Architecture: Bronze (Raw) -> Silver (Cleansed) -> Gold (Datamarts)")
    print("=" * 70)

    source_path = config.DATA_DIR / "sample_sales.csv"
    if not source_path.exists():
        print(f"Source file not found at {source_path}. Generating default sample data...")
        from scripts.generate_sample_data import main as gen_data
        gen_data()

    engine = PipelineEngine()
    print(f"Initialized Pipeline Run ID: {engine.run_id}")
    print(f"Input Source File: {source_path.name}\n")
    print("Executing DAG Tasks:")

    result = engine.execute_all(source_path)

    for task in result["tasks"]:
        status_icon = "✓" if task["status"] == "SUCCEEDED" else ("✗" if task["status"] == "FAILED" else "-")
        print(f" [{status_icon}] Step {task['stage_order']:02d}: {task['name']:<35} | {task['status']:<9} | {task['duration_seconds']:>5.3f}s | Records: {task['records_processed']}")

    print("-" * 70)
    print(f"Pipeline Result: {result['status']}")
    print(f"Overall Duration: {result['duration_seconds']}s")
    print(f"Bronze Raw Records: {result['bronze_records']}")
    print(f"Silver Cleansed Records: {result['silver_records']}")
    print(f"Gold Aggregation Rows: {result['gold_records']}")
    print(f"Data Quality Reliability Score: {result['quality_score']}%")
    print("=" * 70)

    # Output JSON summary for automated test parsing or Node backend integration
    print("\n--- JSON_RESULT_START ---")
    print(json.dumps(result))
    print("--- JSON_RESULT_END ---")

    if result["status"] == "FAILED":
        sys.exit(1)

if __name__ == "__main__":
    main()
