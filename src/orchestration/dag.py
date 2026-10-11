"""
Directed Acyclic Graph (DAG) Definition for Medallion Lakehouse Pipeline
Defines tasks, dependency graphs, and execution contracts.
"""
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum

class TaskStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"

@dataclass
class PipelineTask:
    task_id: str
    name: str
    stage_order: int
    description: str
    dependencies: List[str] = field(default_factory=list)
    status: TaskStatus = TaskStatus.PENDING
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration_seconds: float = 0.0
    records_processed: int = 0
    details: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None
    retries_count: int = 0
    max_retries: int = 1

def build_medallion_dag() -> List[PipelineTask]:
    """Builds the 11-stage Medallion Pipeline DAG with strictly validated dependencies."""
    return [
        PipelineTask(
            task_id="task_01_config",
            name="Validate Configuration",
            stage_order=1,
            description="Verifies environment variables, filesystem permissions, and workspace parameters.",
            dependencies=[]
        ),
        PipelineTask(
            task_id="task_02_discovery",
            name="Discover Input Files",
            stage_order=2,
            description="Discovers pending CSV/JSON payloads in landing data folder and checks size limits.",
            dependencies=["task_01_config"]
        ),
        PipelineTask(
            task_id="task_03_ingest",
            name="Ingest Source Records",
            stage_order=3,
            description="Reads raw streams, extracts row schemas, and validates file headers.",
            dependencies=["task_02_discovery"]
        ),
        PipelineTask(
            task_id="task_04_bronze",
            name="Persist Bronze Dataset",
            stage_order=4,
            description="Appends raw records to Bronze tier with ingestion timestamp and hash audit markers.",
            dependencies=["task_03_ingest"]
        ),
        PipelineTask(
            task_id="task_05_bronze_val",
            name="Run Bronze Validation",
            stage_order=5,
            description="Audits raw row completeness and records schema snapshot in Bronze catalog.",
            dependencies=["task_04_bronze"]
        ),
        PipelineTask(
            task_id="task_06_silver",
            name="Transform & Cleanse Silver",
            stage_order=6,
            description="Performs deduplication, type casting, date normalization, and routes anomalies to quarantine.",
            dependencies=["task_05_bronze_val"]
        ),
        PipelineTask(
            task_id="task_07_silver_val",
            name="Run Silver Quality Checks",
            stage_order=7,
            description="Evaluates 11 enterprise data quality rules and scores data reliability.",
            dependencies=["task_06_silver"]
        ),
        PipelineTask(
            task_id="task_08_gold",
            name="Build Gold Analytical Datasets",
            stage_order=8,
            description="Constructs dimensional business tables: daily revenue, product performance, and regions.",
            dependencies=["task_07_silver_val"]
        ),
        PipelineTask(
            task_id="task_09_metrics",
            name="Calculate Business KPIs",
            stage_order=9,
            description="Computes AOV, gross vs net revenue, customer segment tiers, and delivery rates.",
            dependencies=["task_08_gold"]
        ),
        PipelineTask(
            task_id="task_10_report",
            name="Generate Run Report",
            stage_order=10,
            description="Compiles execution manifest, lineage linkages, and downloadable audit report.",
            dependencies=["task_09_metrics"]
        ),
        PipelineTask(
            task_id="task_11_persist",
            name="Record Run Metrics & Metadata",
            stage_order=11,
            description="Persists run status, duration, and telemetry to SQLite catalog for historical audit.",
            dependencies=["task_10_report"]
        )
    ]
