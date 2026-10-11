"""Unit tests for Pipeline DAG and Orchestration Engine."""
import unittest
from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

import config
from src.orchestration.dag import build_medallion_dag, TaskStatus
from src.orchestration.engine import PipelineEngine

class TestOrchestration(unittest.TestCase):
    def test_dag_structure(self):
        tasks = build_medallion_dag()
        self.assertEqual(len(tasks), 11)
        self.assertEqual(tasks[0].task_id, "task_01_config")
        self.assertEqual(tasks[-1].task_id, "task_11_persist")

        # Verify topological ordering
        task_ids = {t.task_id for t in tasks}
        for t in tasks:
            for dep in t.dependencies:
                self.assertIn(dep, task_ids)

    def test_pipeline_engine_run(self):
        engine = PipelineEngine()
        result = engine.execute_all()

        self.assertEqual(result["status"], "SUCCEEDED")
        self.assertEqual(result["total_stages"], 11)
        self.assertEqual(result["passed_stages"], 11)
        self.assertEqual(result["failed_stages"], 0)
        self.assertGreater(result["bronze_records"], 0)
        self.assertGreater(result["silver_records"], 0)

if __name__ == "__main__":
    unittest.main()
