"""
Data Lineage Tracker
Maps upstream-to-downstream relationships between data assets, pipeline stages, and analytical targets.
Tracks column schema evolution and transformation logic.
"""
from pathlib import Path
import json
from typing import Dict, Any, List
import config

class LineageTracker:
    def __init__(self):
        pass

    def get_lineage_graph(self) -> Dict[str, Any]:
        """Returns directed nodes and edges mapping the Medallion flow."""
        nodes = [
            {
                "id": "node_source",
                "label": "Landing File: sample_sales.csv",
                "layer": "Source Landing",
                "type": "file",
                "path": "data/sample_sales.csv",
                "format": "CSV (Raw Unvalidated)",
                "description": "Incoming transaction data from e-commerce store landing zone.",
                "owner": "Storefront POS Ingestion Service",
                "classification": "Confidential / PII"
            },
            {
                "id": "node_bronze",
                "label": "Bronze Table: bronze_sales",
                "layer": "Bronze (Raw)",
                "type": "table",
                "path": "lakehouse_storage/bronze/bronze_sales_latest.csv",
                "format": "Medallion Raw Append",
                "description": "Immutable raw records preserved verbatim with ingestion timestamps and SHA-256 hashes.",
                "owner": "Data Platform Engineering",
                "classification": "Internal Restrictive"
            },
            {
                "id": "node_quarantine",
                "label": "Quarantine Dataset",
                "layer": "Quarantine",
                "type": "dataset",
                "path": "lakehouse_storage/quarantine/quarantine_latest.json",
                "format": "JSON Defect Manifest",
                "description": "Rejected rows failing date integrity, primary key constraints, or numerical ranges.",
                "owner": "Data Quality Steward",
                "classification": "Internal Audit"
            },
            {
                "id": "node_silver",
                "label": "Silver Table: silver_sales",
                "layer": "Silver (Cleansed)",
                "type": "table",
                "path": "lakehouse_storage/silver/silver_sales_latest.csv",
                "format": "Cleansed & Conformed",
                "description": "Deduplicated, standardized, validated transaction line items with computed gross/net fields.",
                "owner": "Core Analytics Engineering",
                "classification": "Governed Internal"
            },
            {
                "id": "node_gold_daily",
                "label": "Gold Mart: daily_revenue",
                "layer": "Gold (Business)",
                "type": "table",
                "path": "lakehouse_storage/gold/gold_daily_revenue_latest.csv",
                "format": "Aggregated Datamart",
                "description": "Daily executive revenue trends, order counts, and average order value (AOV).",
                "owner": "Finance BI Team",
                "classification": "Business Critical"
            },
            {
                "id": "node_gold_product",
                "label": "Gold Mart: product_performance",
                "layer": "Gold (Business)",
                "type": "table",
                "path": "lakehouse_storage/gold/gold_product_performance_latest.csv",
                "format": "Aggregated Datamart",
                "description": "Product SKU units sold, revenue contribution, and merchandise category metrics.",
                "owner": "Merchandising Analytics",
                "classification": "Internal Analytics"
            },
            {
                "id": "node_gold_regional",
                "label": "Gold Mart: regional_performance",
                "layer": "Gold (Business)",
                "type": "table",
                "path": "lakehouse_storage/gold/gold_regional_performance_latest.csv",
                "format": "Aggregated Datamart",
                "description": "Regional revenue breakdown and average logistics shipping cost.",
                "owner": "Supply Chain & Ops",
                "classification": "Internal Analytics"
            },
            {
                "id": "node_gold_customers",
                "label": "Gold Mart: customer_segments",
                "layer": "Gold (Business)",
                "type": "table",
                "path": "lakehouse_storage/gold/gold_customer_segments_latest.csv",
                "format": "Aggregated Datamart",
                "description": "Customer lifetime spend, order frequency, and loyalty tier segmentation.",
                "owner": "Growth & CRM",
                "classification": "Confidential / Masked"
            },
            {
                "id": "node_reports",
                "label": "Executive BI Reports & AI Insights",
                "layer": "Consumption",
                "type": "dashboard",
                "path": "lakehouse_storage/run_report_latest.json",
                "format": "JSON / Streamlit BI",
                "description": "Downstream consumption layer: dashboards, SQL workspaces, and automated executive alerts.",
                "owner": "Business Stakeholders",
                "classification": "General Access"
            }
        ]

        edges = [
            {"source": "node_source", "target": "node_bronze", "transformation": "Raw Ingestion & Hash Stamping"},
            {"source": "node_bronze", "target": "node_silver", "transformation": "Deduplication & Schema Validation"},
            {"source": "node_bronze", "target": "node_quarantine", "transformation": "Defect Triage & Quarantine Routing"},
            {"source": "node_silver", "target": "node_gold_daily", "transformation": "Temporal Grouping by order_date"},
            {"source": "node_silver", "target": "node_gold_product", "transformation": "Aggregation by product_id & category"},
            {"source": "node_silver", "target": "node_gold_regional", "transformation": "Aggregation by customer_region"},
            {"source": "node_silver", "target": "node_gold_customers", "transformation": "Customer LTV & Tier Binning"},
            {"source": "node_gold_daily", "target": "node_reports", "transformation": "Revenue BI Dashboard"},
            {"source": "node_gold_product", "target": "node_reports", "transformation": "Merchandise KPI Matrix"},
            {"source": "node_gold_regional", "target": "node_reports", "transformation": "Geographic Sales Map"},
            {"source": "node_gold_customers", "target": "node_reports", "transformation": "VIP Cohort Campaign Feed"}
        ]

        return {
            "application_level_lineage": True,
            "recorded_at": "Dynamic Metadata Engine",
            "nodes": nodes,
            "edges": edges
        }
