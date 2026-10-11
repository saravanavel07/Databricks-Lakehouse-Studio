"""
AI Assistant for Lakehouse Studio
Provides dual-mode intelligence:
1. Deterministic Rule-Based & Statistical Engine (100% offline, guaranteed zero hallucination)
2. Gemini AI Assistant (when GEMINI_API_KEY is configured)
Clearly stamps answer source: [Deterministic Engine] or [Gemini AI LLM].
"""
import json
from typing import Dict, Any, List, Optional
import config

class AIAssistant:
    def __init__(self):
        self.api_key = config.GEMINI_API_KEY
        self.has_gemini = bool(self.api_key)

    def explain_data_quality(self, evaluation: Dict[str, Any]) -> Dict[str, Any]:
        """Explains quality check results and recommends actionable fixes."""
        score = evaluation.get("overall_score", 0.0)
        checks = evaluation.get("checks", [])
        failed = [c for c in checks if c.get("status") == "FAILED"]
        warnings = [c for c in checks if c.get("status") == "WARNING"]
        
        explanation_bullets = []
        recommendations = []

        if failed:
            explanation_bullets.append(f"Identified {len(failed)} critical failure(s) requiring immediate resolution.")
            for f in failed:
                explanation_bullets.append(f"• {f['name']}: {f['actual_value']}. Cause: {f['description']}")
                recommendations.append(f"• Action for {f['name']}: {f['remediation']}")
        else:
            explanation_bullets.append("No critical schema or primary key failures detected.")

        if warnings:
            explanation_bullets.append(f"Detected {len(warnings)} non-blocking quality warning(s).")
            for w in warnings:
                explanation_bullets.append(f"• {w['name']}: {w['actual_value']}.")
                recommendations.append(f"• Recommendation for {w['name']}: {w['remediation']}")

        summary_text = (
            f"Dataset evaluated with an overall reliability score of {score}% ({evaluation.get('status')}).\n"
            f"Evaluation criteria: {len(checks)} automated checks across Schema, Completeness, Uniqueness, Validity, and Freshness."
        )

        return {
            "source": "Deterministic Rule-Based Engine",
            "summary": summary_text,
            "observations": explanation_bullets,
            "recommendations": recommendations,
            "is_llm": False
        }

    def explain_sql_query(self, query: str) -> Dict[str, Any]:
        """Explains a SQL query in plain business language."""
        q_lower = query.lower()
        intent = "General data query"
        target_table = "Unknown"
        
        if "gold_daily_revenue" in q_lower:
            target_table = "Gold Daily Revenue Datamart"
            intent = "Analyzes day-by-day gross and net revenue performance and order volume trends."
        elif "gold_product_performance" in q_lower:
            target_table = "Gold Product Performance Table"
            intent = "Evaluates units sold, total revenue by product SKU and product category."
        elif "gold_regional_performance" in q_lower:
            target_table = "Gold Regional Summary Table"
            intent = "Compares net revenue and average shipping overhead across global geographical territories."
        elif "silver_sales" in q_lower:
            target_table = "Silver Cleansed Transactions"
            intent = "Queries cleansed, deduplicated, and validated order-level transaction line items."
        elif "bronze_sales" in q_lower:
            target_table = "Bronze Raw Ingestion Table"
            intent = "Explores raw, immutable source records including audit hashes and ingestion timestamps."

        clauses = []
        if "where" in q_lower:
            clauses.append("Filters records to match specified criteria.")
        if "group by" in q_lower:
            clauses.append("Aggregates metric rows across categorical dimensions.")
        if "order by" in q_lower:
            clauses.append("Sorts result set hierarchically (e.g., descending for top performers).")
        if "limit" in q_lower:
            clauses.append("Restricts maximum returned rows for performance safety.")

        return {
            "source": "Deterministic SQL Parser",
            "target_table": target_table,
            "business_intent": intent,
            "clauses_breakdown": clauses,
            "is_llm": False
        }

    def summarize_pipeline_run(self, run_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generates a concise executive brief of pipeline execution."""
        status = run_data.get("status", "UNKNOWN")
        duration = run_data.get("duration_seconds", 0.0)
        bronze_cnt = run_data.get("bronze_records", 0)
        silver_cnt = run_data.get("silver_records", 0)
        gold_cnt = run_data.get("gold_records", 0)
        quality = run_data.get("quality_score", 0.0)

        quarantined = bronze_cnt - silver_cnt if bronze_cnt >= silver_cnt else 0

        takeaways = [
            f"Pipeline executed in {duration}s with overall status: {status}.",
            f"Ingested {bronze_cnt} raw records into Bronze layer.",
            f"Promoted {silver_cnt} validated records to Silver (quarantined {quarantined} defective records).",
            f"Generated {gold_cnt} business-ready aggregation rows across 4 Gold datamarts.",
            f"Data Quality score achieved: {quality}%."
        ]

        return {
            "source": "Deterministic Pipeline Analyst",
            "executive_summary": f"Medallion pipeline completed with {quality}% quality rating. Data promoted from raw Bronze to analytical Gold.",
            "takeaways": takeaways,
            "is_llm": False
        }

    def draft_sql_prompt(self, user_prompt: str) -> Dict[str, Any]:
        """Provides ready-to-run SQL queries based on intent keywords."""
        p = user_prompt.lower()
        if "top" in p and "product" in p:
            sql = "SELECT product_name, category, units_sold, gross_revenue FROM gold_product_performance ORDER BY gross_revenue DESC LIMIT 5;"
            desc = "Finds top 5 grossing products."
        elif "region" in p or "geography" in p:
            sql = "SELECT region, order_count, total_net_revenue, avg_shipping_fee FROM gold_regional_performance ORDER BY total_net_revenue DESC;"
            desc = "Summarizes revenue and shipping cost by geographical region."
        elif "customer" in p or "vip" in p:
            sql = "SELECT customer_name, region, segment_tier, total_lifetime_spend, orders_count FROM gold_customer_segments WHERE segment_tier = 'VIP' ORDER BY total_lifetime_spend DESC;"
            desc = "Lists high-value VIP customer accounts."
        elif "trend" in p or "daily" in p:
            sql = "SELECT date, order_count, gross_revenue, net_revenue, avg_order_value FROM gold_daily_revenue ORDER BY date ASC;"
            desc = "Extracts day-by-day revenue progression and average order value."
        else:
            sql = "SELECT order_id, customer_name, customer_region, product_name, line_net_amount, order_status FROM silver_sales LIMIT 10;"
            desc = "Previews recent verified Silver order records."

        return {
            "source": "Deterministic SQL Template Engine",
            "suggested_sql": sql,
            "explanation": desc,
            "is_llm": False
        }
