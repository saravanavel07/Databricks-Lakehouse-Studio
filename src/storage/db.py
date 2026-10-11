"""
SQLite Metadata & Storage Layer for Lakehouse Studio
Maintains pipeline run histories, audit logs, data quality snapshots, and table schemas.
"""
import sqlite3
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
import config

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(config.METADATA_DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_database() -> None:
    """Initializes tables for metadata, runs, audits, and datasets."""
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Pipeline execution runs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pipeline_runs (
                run_id TEXT PRIMARY KEY,
                trigger_type TEXT,
                status TEXT,
                start_time TEXT,
                end_time TEXT,
                duration_seconds REAL,
                total_stages INTEGER,
                passed_stages INTEGER,
                failed_stages INTEGER,
                bronze_records INTEGER,
                silver_records INTEGER,
                gold_records INTEGER,
                quality_score REAL,
                error_message TEXT
            )
        """)
        
        # Stage execution details
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS stage_executions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id TEXT,
                stage_name TEXT,
                stage_order INTEGER,
                status TEXT,
                start_time TEXT,
                end_time TEXT,
                duration_seconds REAL,
                records_processed INTEGER,
                details TEXT,
                error_message TEXT,
                FOREIGN KEY (run_id) REFERENCES pipeline_runs(run_id)
            )
        """)
        
        # Quality check results
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quality_checks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id TEXT,
                check_name TEXT,
                category TEXT,
                status TEXT,
                threshold_val REAL,
                actual_val REAL,
                failed_records_count INTEGER,
                remediation TEXT,
                timestamp TEXT
            )
        """)
        
        # Audit log for governance and data catalog access
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT,
                entity_type TEXT,
                entity_name TEXT,
                user_role TEXT,
                status TEXT,
                details TEXT,
                timestamp TEXT
            )
        """)
        
        # Quarantined records
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quarantine_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id TEXT,
                record_id TEXT,
                reasons TEXT,
                raw_payload TEXT,
                created_at TEXT
            )
        """)
        conn.commit()

def record_audit(action: str, entity_type: str, entity_name: str, user_role: str, status: str, details: Dict[str, Any]) -> None:
    """Logs governance and execution audit events."""
    try:
        with get_connection() as conn:
            conn.execute(
                """INSERT INTO audit_logs (action, entity_type, entity_name, user_role, status, details, timestamp)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (action, entity_type, entity_name, user_role, status, json.dumps(details), datetime.utcnow().isoformat())
            )
            conn.commit()
    except Exception as e:
        print(f"Audit log error: {e}")

def get_recent_runs(limit: int = 10) -> List[Dict[str, Any]]:
    init_database()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pipeline_runs ORDER BY start_time DESC LIMIT ?", (limit,))
        return [dict(row) for row in cursor.fetchall()]

def get_audit_logs(limit: int = 50) -> List[Dict[str, Any]]:
    init_database()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?", (limit,))
        return [dict(row) for row in cursor.fetchall()]

init_database()
