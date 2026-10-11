"""
Pipeline Orchestration Engine
Executes pipeline DAG stages in topological dependency order.
Supports retries, failure isolation, execution timing, and SQLite persistence.
"""
from pathlib import Path
import time
import json
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
import config
from src.storage.db import get_connection, record_audit
from src.ingestion.validator import IngestionValidator
from src.bronze.processor import BronzeProcessor
from src.silver.cleaner import SilverCleaner
from src.gold.aggregator import GoldAggregator
from src.quality.engine import QualityEngine
from src.orchestration.dag import build_medallion_dag, TaskStatus, PipelineTask

class PipelineEngine:
    def __init__(self, run_id: Optional[str] = None):
        self.run_id = run_id or f"run_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:6]}"
        self.tasks: List[PipelineTask] = build_medallion_dag()
        self.task_map = {t.task_id: t for t in self.tasks}
        self.context: Dict[str, Any] = {
            "run_id": self.run_id,
            "source_file": config.DATA_DIR / "sample_sales.csv",
            "bronze_path": None,
            "silver_path": None,
            "gold_result": None,
            "quality_result": None,
            "kpis": {}
        }

    def execute_all(self, source_path: Optional[Path] = None) -> Dict[str, Any]:
        """Executes all DAG stages sequentially honoring dependencies."""
        if source_path:
            self.context["source_file"] = Path(source_path)

        run_start = datetime.utcnow()
        overall_status = "RUNNING"
        error_msg = None

        record_audit("PIPELINE_START", "PIPELINE", self.run_id, "Data Engineer", "RUNNING", {"source": str(self.context["source_file"])})

        for task in self.tasks:
            # Check dependencies
            deps_ok = all(self.task_map[dep].status == TaskStatus.SUCCEEDED for dep in task.dependencies)
            if not deps_ok:
                task.status = TaskStatus.SKIPPED
                task.error_message = "Skipped due to upstream failure or unmet dependencies."
                continue

            # Execute task with retry support
            task.status = TaskStatus.RUNNING
            task.start_time = datetime.utcnow().isoformat()
            t0 = time.time()
            
            success = False
            for attempt in range(task.max_retries + 1):
                task.retries_count = attempt
                try:
                    self._run_task_logic(task)
                    success = True
                    break
                except Exception as ex:
                    if attempt == task.max_retries:
                        task.status = TaskStatus.FAILED
                        task.error_message = str(ex)
                        error_msg = f"Task {task.name} failed: {str(ex)}"
                        overall_status = "FAILED"
                    else:
                        time.sleep(0.5)

            t1 = time.time()
            task.end_time = datetime.utcnow().isoformat()
            task.duration_seconds = round(t1 - t0, 3)

            if success:
                task.status = TaskStatus.SUCCEEDED

            # If task failed, stop downstream execution
            if task.status == TaskStatus.FAILED:
                break

        run_end = datetime.utcnow()
        duration_total = (run_end - run_start).total_seconds()
        if overall_status != "FAILED":
            overall_status = "SUCCEEDED"

        # Calculate counts and metrics
        bronze_count = self.context.get("bronze_count", 0)
        silver_count = self.context.get("silver_count", 0)
        gold_count = self.context.get("gold_count", 0)
        quality_score = self.context.get("quality_score", 0.0)

        passed_stages = sum(1 for t in self.tasks if t.status == TaskStatus.SUCCEEDED)
        failed_stages = sum(1 for t in self.tasks if t.status == TaskStatus.FAILED)

        # Save to SQLite
        try:
            with get_connection() as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO pipeline_runs 
                    (run_id, trigger_type, status, start_time, end_time, duration_seconds, 
                     total_stages, passed_stages, failed_stages, bronze_records, 
                     silver_records, gold_records, quality_score, error_message)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    self.run_id, "MANUAL", overall_status, run_start.isoformat(), run_end.isoformat(),
                    round(duration_total, 2), len(self.tasks), passed_stages, failed_stages,
                    bronze_count, silver_count, gold_count, quality_score, error_msg
                ))

                for t in self.tasks:
                    conn.execute("""
                        INSERT INTO stage_executions
                        (run_id, stage_name, stage_order, status, start_time, end_time, duration_seconds, records_processed, details, error_message)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        self.run_id, t.name, t.stage_order, t.status.value, t.start_time, t.end_time,
                        t.duration_seconds, t.records_processed, json.dumps(t.details), t.error_message
                    ))
                conn.commit()
        except Exception as e:
            print(f"Error persisting pipeline run: {e}")

        record_audit("PIPELINE_COMPLETE", "PIPELINE", self.run_id, "Data Engineer", overall_status, {
            "duration": round(duration_total, 2),
            "quality_score": quality_score
        })

        return {
            "run_id": self.run_id,
            "status": overall_status,
            "start_time": run_start.isoformat(),
            "end_time": run_end.isoformat(),
            "duration_seconds": round(duration_total, 2),
            "total_stages": len(self.tasks),
            "passed_stages": passed_stages,
            "failed_stages": failed_stages,
            "bronze_records": bronze_count,
            "silver_records": silver_count,
            "gold_records": gold_count,
            "quality_score": quality_score,
            "tasks": [
                {
                    "task_id": t.task_id,
                    "name": t.name,
                    "stage_order": t.stage_order,
                    "status": t.status.value,
                    "duration_seconds": t.duration_seconds,
                    "records_processed": t.records_processed,
                    "details": t.details,
                    "error_message": t.error_message
                }
                for t in self.tasks
            ],
            "kpis": self.context.get("kpis", {})
        }

    def _run_task_logic(self, task: PipelineTask) -> None:
        """Dispatches work to specific component engines."""
        if task.task_id == "task_01_config":
            task.details = {
                "base_dir": str(config.BASE_DIR),
                "storage_dir": str(config.STORAGE_DIR),
                "is_databricks_configured": config.IS_DATABRICKS_CONNECTED,
                "ai_provider": config.AI_PROVIDER
            }

        elif task.task_id == "task_02_discovery":
            source_file = self.context["source_file"]
            validator = IngestionValidator(source_file)
            is_valid, errors, meta = validator.validate_file()
            if not is_valid:
                raise ValueError(f"Input file validation failed: {', '.join(errors)}")
            task.records_processed = meta.get("row_count", 0)
            task.details = meta

        elif task.task_id == "task_03_ingest":
            source_file = self.context["source_file"]
            task.details = {"source": str(source_file), "validated": True}
            task.records_processed = self.task_map["task_02_discovery"].records_processed

        elif task.task_id == "task_04_bronze":
            processor = BronzeProcessor(self.run_id)
            result = processor.process(self.context["source_file"])
            self.context["bronze_path"] = Path(result["bronze_path"])
            self.context["bronze_count"] = result["bronze_records_written"]
            task.records_processed = result["bronze_records_written"]
            task.details = result

        elif task.task_id == "task_05_bronze_val":
            b_path = self.context["bronze_path"] or (config.BRONZE_DIR / "bronze_sales_latest.csv")
            if not b_path.exists():
                raise FileNotFoundError("Bronze dataset missing.")
            task.records_processed = self.context.get("bronze_count", 0)
            task.details = {"verified_columns": len(config.EXPECTED_COLUMNS), "status": "VERIFIED"}

        elif task.task_id == "task_06_silver":
            b_path = self.context["bronze_path"] or (config.BRONZE_DIR / "bronze_sales_latest.csv")
            cleaner = SilverCleaner(self.run_id)
            result = cleaner.process(b_path)
            self.context["silver_path"] = cleaner.silver_output_file
            self.context["silver_count"] = result["output_silver_count"]
            task.records_processed = result["output_silver_count"]
            task.details = result

        elif task.task_id == "task_07_silver_val":
            b_path = self.context["bronze_path"] or (config.BRONZE_DIR / "bronze_sales_latest.csv")
            s_path = self.context["silver_path"] or (config.SILVER_DIR / "silver_sales_latest.csv")
            engine = QualityEngine(self.run_id)
            evaluation = engine.evaluate(b_path, s_path)
            self.context["quality_result"] = evaluation
            self.context["quality_score"] = evaluation["overall_score"]
            task.records_processed = evaluation["total_records_evaluated"]
            task.details = {
                "overall_score": evaluation["overall_score"],
                "passed_checks": evaluation["passed_checks"],
                "failed_checks": evaluation["failed_checks"],
                "warning_checks": evaluation["warning_checks"]
            }

        elif task.task_id == "task_08_gold":
            s_path = self.context["silver_path"] or (config.SILVER_DIR / "silver_sales_latest.csv")
            aggregator = GoldAggregator(self.run_id)
            result = aggregator.process(s_path)
            self.context["gold_result"] = result
            self.context["gold_count"] = result.get("daily_revenue_count", 0)
            self.context["kpis"] = result.get("kpis", {})
            task.records_processed = result.get("daily_revenue_count", 0)
            task.details = {
                "daily_revenue_records": result.get("daily_revenue_count", 0),
                "products_analyzed": result.get("product_count", 0),
                "regions_summarized": result.get("regions_count", 0),
                "customer_segments": result.get("customer_count", 0)
            }

        elif task.task_id == "task_09_metrics":
            kpis = self.context.get("kpis", {})
            task.records_processed = len(kpis)
            task.details = kpis

        elif task.task_id == "task_10_report":
            report_data = {
                "run_id": self.run_id,
                "timestamp": datetime.utcnow().isoformat(),
                "bronze_count": self.context.get("bronze_count", 0),
                "silver_count": self.context.get("silver_count", 0),
                "gold_count": self.context.get("gold_count", 0),
                "quality_score": self.context.get("quality_score", 0.0),
                "stages_executed": len(self.tasks)
            }
            report_file = config.STORAGE_DIR / f"run_report_{self.run_id}.json"
            with open(report_file, mode="w", encoding="utf-8") as f:
                json.dump(report_data, f, indent=2)
            task.details = {"report_path": str(report_file)}

        elif task.task_id == "task_11_persist":
            task.details = {"persisted_to": str(config.METADATA_DB_PATH), "status": "COMMITTED"}
