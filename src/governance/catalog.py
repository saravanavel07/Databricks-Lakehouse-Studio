"""
Data Governance & Unity Catalog Demonstration
Demonstrates a 3-tier Lakehouse hierarchy (catalog.schema.table), Role-Based Access Control (RBAC),
column masking for sensitive PII data, and audit tracking.
Clearly identified as an application-level conceptual demonstration.
"""
from typing import Dict, Any, List, Optional
import config
from src.storage.db import record_audit

# Available Persona Roles
ROLES = {
    "DATA_ENGINEER": {
        "title": "Data Platform Engineer",
        "description": "Full read/write permissions on Landing, Bronze, Silver, and Gold schemas.",
        "allowed_schemas": ["bronze", "silver", "gold", "quarantine"],
        "can_view_pii": True,
        "can_run_pipelines": True
    },
    "DATA_ANALYST": {
        "title": "Business Data Analyst",
        "description": "Read-only access to Silver and Gold. Sensitive PII columns are masked.",
        "allowed_schemas": ["silver", "gold"],
        "can_view_pii": False,
        "can_run_pipelines": False
    },
    "AUDITOR": {
        "title": "Governance & Quality Auditor",
        "description": "Read access to Quarantine, Audit logs, and Data Quality results.",
        "allowed_schemas": ["quarantine", "audit"],
        "can_view_pii": False,
        "can_run_pipelines": False
    },
    "COMPLIANCE_OFFICER": {
        "title": "Data Privacy & Compliance Officer",
        "description": "Full visibility into catalog tags, classifications, PII tracking, and retention.",
        "allowed_schemas": ["silver", "gold", "audit"],
        "can_view_pii": True,
        "can_run_pipelines": False
    }
}

CATALOG_STRUCTURE = {
    "catalog_name": "lakehouse_studio",
    "storage_root": str(config.STORAGE_DIR),
    "schemas": [
        {
            "name": "bronze",
            "type": "Raw Storage",
            "tables": [
                {
                    "name": "bronze_sales",
                    "full_name": "lakehouse_studio.bronze.bronze_sales",
                    "format": "CSV / Append",
                    "classification": "Confidential",
                    "retention_days": 365,
                    "columns": [
                        {"name": "order_id", "type": "STRING", "comment": "Original order ID"},
                        {"name": "order_date", "type": "STRING", "comment": "Unvalidated order date"},
                        {"name": "customer_email", "type": "STRING", "comment": "Raw customer email (PII)", "pii": True},
                        {"name": "_ingestion_timestamp", "type": "TIMESTAMP", "comment": "Pipeline ingestion time"},
                        {"name": "_record_hash", "type": "STRING", "comment": "SHA-256 payload fingerprint"}
                    ]
                }
            ]
        },
        {
            "name": "silver",
            "type": "Cleansed & Standardized",
            "tables": [
                {
                    "name": "silver_sales",
                    "full_name": "lakehouse_studio.silver.silver_sales",
                    "format": "Delta / Conformed",
                    "classification": "Internal Governed",
                    "retention_days": 730,
                    "columns": [
                        {"name": "order_id", "type": "STRING", "comment": "Unique primary key"},
                        {"name": "order_date", "type": "DATE", "comment": "Normalized ISO date"},
                        {"name": "customer_email", "type": "STRING", "comment": "Validated contact email", "pii": True},
                        {"name": "unit_price", "type": "DOUBLE", "comment": "Item price in USD"},
                        {"name": "quantity", "type": "INTEGER", "comment": "Ordered units"},
                        {"name": "line_net_amount", "type": "DOUBLE", "comment": "Gross minus discount plus shipping"}
                    ]
                }
            ]
        },
        {
            "name": "gold",
            "type": "Curated Business Datamarts",
            "tables": [
                {
                    "name": "daily_revenue",
                    "full_name": "lakehouse_studio.gold.daily_revenue",
                    "format": "Aggregated View",
                    "classification": "Business Critical",
                    "retention_days": 1825,
                    "columns": [
                        {"name": "date", "type": "DATE", "comment": "Calendar date"},
                        {"name": "order_count", "type": "INTEGER", "comment": "Daily transaction volume"},
                        {"name": "net_revenue", "type": "DOUBLE", "comment": "Total daily net turnover"}
                    ]
                },
                {
                    "name": "product_performance",
                    "full_name": "lakehouse_studio.gold.product_performance",
                    "format": "Aggregated View",
                    "classification": "Internal Analytics",
                    "retention_days": 1825,
                    "columns": [
                        {"name": "product_id", "type": "STRING", "comment": "Product catalog SKU"},
                        {"name": "units_sold", "type": "INTEGER", "comment": "Cumulative volume"},
                        {"name": "gross_revenue", "type": "DOUBLE", "comment": "Gross sales generated"}
                    ]
                }
            ]
        }
    ]
}

def mask_pii_email(email: str) -> str:
    """Masks customer email addresses for non-privileged roles (e.g. j***@domain.com)."""
    if not email or "@" not in email:
        return "********"
    parts = email.split("@")
    user, domain = parts[0], parts[1]
    masked_user = user[0] + "***" if len(user) > 1 else "*"
    return f"{masked_user}@{domain}"

def check_table_access(role_key: str, table_full_name: str) -> Dict[str, Any]:
    """Evaluates access rights based on user role and records audit event."""
    role = ROLES.get(role_key, ROLES["DATA_ANALYST"])
    schema_name = table_full_name.split(".")[1] if "." in table_full_name else table_full_name
    
    is_allowed = schema_name in role["allowed_schemas"]
    status = "ALLOWED" if is_allowed else "DENIED"

    record_audit(
        action="ACCESS_CHECK",
        entity_type="TABLE",
        entity_name=table_full_name,
        user_role=role["title"],
        status=status,
        details={"schema": schema_name, "can_view_pii": role["can_view_pii"]}
    )

    return {
        "role": role["title"],
        "table": table_full_name,
        "status": status,
        "can_view_pii": role["can_view_pii"],
        "reason": f"Role '{role['title']}' has access to: {', '.join(role['allowed_schemas'])}"
    }
