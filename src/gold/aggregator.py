"""
Gold Layer Aggregator & Analytical Datamart
Builds high-value, business-ready analytical datasets from verified Silver records.
Produces KPIs, daily revenue trends, product performance, regional metrics, and customer segments.
"""
from pathlib import Path
import csv
import json
from collections import defaultdict
from datetime import datetime
from typing import Dict, Any, List
import config

class GoldAggregator:
    def __init__(self, run_id: str):
        self.run_id = run_id
        self.daily_revenue_file = config.GOLD_DIR / f"gold_daily_revenue_{run_id}.csv"
        self.daily_revenue_latest = config.GOLD_DIR / "gold_daily_revenue_latest.csv"
        self.product_perf_file = config.GOLD_DIR / f"gold_product_performance_{run_id}.csv"
        self.product_perf_latest = config.GOLD_DIR / "gold_product_performance_latest.csv"
        self.regional_file = config.GOLD_DIR / f"gold_regional_performance_{run_id}.csv"
        self.regional_latest = config.GOLD_DIR / "gold_regional_performance_latest.csv"
        self.customer_file = config.GOLD_DIR / f"gold_customer_segments_{run_id}.csv"
        self.customer_latest = config.GOLD_DIR / "gold_customer_segments_latest.csv"
        self.kpis_file = config.GOLD_DIR / f"gold_kpis_{run_id}.json"

    def process(self, silver_file_path: Path) -> Dict[str, Any]:
        start_time = datetime.utcnow()
        silver_rows: List[Dict[str, Any]] = []

        with open(silver_file_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                silver_rows.append(r)

        if not silver_rows:
            return {"status": "EMPTY_INPUT", "kpis": {}}

        # 1. Calculate Aggregations
        # Daily Revenue
        daily_data = defaultdict(lambda: {"order_count": 0, "gross_revenue": 0.0, "net_revenue": 0.0, "items_sold": 0})
        # Product Performance
        product_data = defaultdict(lambda: {"product_name": "", "category": "", "units_sold": 0, "total_revenue": 0.0, "order_count": 0})
        # Regional Performance
        region_data = defaultdict(lambda: {"order_count": 0, "total_revenue": 0.0, "total_shipping": 0.0})
        # Customer Segments
        cust_data = defaultdict(lambda: {"name": "", "region": "", "order_count": 0, "total_spend": 0.0, "items_purchased": 0})

        total_gross = 0.0
        total_net = 0.0
        total_units = 0
        delivered_count = 0

        for r in silver_rows:
            date_str = r.get("order_date") or "Unknown"
            gross = float(r.get("line_gross_amount", 0.0))
            net = float(r.get("line_net_amount", 0.0))
            shipping = float(r.get("shipping_fee", 0.0))
            qty = int(r.get("quantity", 0))
            prod_id = r.get("product_id", "UNKNOWN")
            prod_name = r.get("product_name", "Unknown")
            cat = r.get("product_category", "Unknown")
            reg = r.get("customer_region", "Unknown")
            cust_id = r.get("customer_id", "UNKNOWN")
            cust_name = r.get("customer_name", "Unknown")
            status = r.get("order_status", "")

            total_gross += gross
            total_net += net
            total_units += qty
            if status == "DELIVERED":
                delivered_count += 1

            # Daily
            daily_data[date_str]["order_count"] += 1
            daily_data[date_str]["gross_revenue"] += gross
            daily_data[date_str]["net_revenue"] += net
            daily_data[date_str]["items_sold"] += qty

            # Product
            product_data[prod_id]["product_name"] = prod_name
            product_data[prod_id]["category"] = cat
            product_data[prod_id]["units_sold"] += qty
            product_data[prod_id]["total_revenue"] += gross
            product_data[prod_id]["order_count"] += 1

            # Region
            region_data[reg]["order_count"] += 1
            region_data[reg]["total_revenue"] += net
            region_data[reg]["total_shipping"] += shipping

            # Customer
            cust_data[cust_id]["name"] = cust_name
            cust_data[cust_id]["region"] = reg
            cust_data[cust_id]["order_count"] += 1
            cust_data[cust_id]["total_spend"] += net
            cust_data[cust_id]["items_purchased"] += qty

        # Format Daily Table
        daily_rows = []
        for d, v in sorted(daily_data.items()):
            aov = round(v["net_revenue"] / v["order_count"], 2) if v["order_count"] > 0 else 0.0
            daily_rows.append({
                "date": d,
                "order_count": v["order_count"],
                "gross_revenue": round(v["gross_revenue"], 2),
                "net_revenue": round(v["net_revenue"], 2),
                "items_sold": v["items_sold"],
                "avg_order_value": aov
            })

        # Format Product Table
        product_rows = []
        for pid, v in sorted(product_data.items(), key=lambda x: x[1]["total_revenue"], reverse=True):
            product_rows.append({
                "product_id": pid,
                "product_name": v["product_name"],
                "category": v["category"],
                "units_sold": v["units_sold"],
                "gross_revenue": round(v["total_revenue"], 2),
                "order_count": v["order_count"]
            })

        # Format Regional Table
        region_rows = []
        for reg, v in sorted(region_data.items(), key=lambda x: x[1]["total_revenue"], reverse=True):
            avg_ship = round(v["total_shipping"] / v["order_count"], 2) if v["order_count"] > 0 else 0.0
            region_rows.append({
                "region": reg,
                "order_count": v["order_count"],
                "total_net_revenue": round(v["total_revenue"], 2),
                "avg_shipping_fee": avg_ship
            })

        # Format Customer Segments
        cust_rows = []
        for cid, v in sorted(cust_data.items(), key=lambda x: x[1]["total_spend"], reverse=True):
            spend = round(v["total_spend"], 2)
            tier = "VIP" if spend >= 600 else ("Growth" if spend >= 250 else "Standard")
            cust_rows.append({
                "customer_id": cid,
                "customer_name": v["name"],
                "region": v["region"],
                "orders_count": v["order_count"],
                "total_lifetime_spend": spend,
                "items_purchased": v["items_purchased"],
                "segment_tier": tier
            })

        # Save all Gold datasets
        self._write_csv(self.daily_revenue_file, self.daily_revenue_latest, daily_rows)
        self._write_csv(self.product_perf_file, self.product_perf_latest, product_rows)
        self._write_csv(self.regional_file, self.regional_latest, region_rows)
        self._write_csv(self.customer_file, self.customer_latest, cust_rows)

        # Global KPIs
        total_orders = len(silver_rows)
        kpis = {
            "run_id": self.run_id,
            "calculated_at": datetime.utcnow().isoformat(),
            "total_orders": total_orders,
            "total_gross_revenue": round(total_gross, 2),
            "total_net_revenue": round(total_net, 2),
            "total_units_sold": total_units,
            "average_order_value": round(total_net / total_orders, 2) if total_orders else 0.0,
            "delivery_rate_pct": round((delivered_count / total_orders) * 100, 1) if total_orders else 0.0,
            "unique_customers": len(cust_data),
            "unique_products": len(product_data),
            "duration_seconds": (datetime.utcnow() - start_time).total_seconds()
        }

        with open(self.kpis_file, mode="w", encoding="utf-8") as f_kpis:
            json.dump(kpis, f_kpis, indent=2)

        return {
            "status": "SUCCEEDED",
            "kpis": kpis,
            "daily_revenue_count": len(daily_rows),
            "product_count": len(product_rows),
            "regions_count": len(region_rows),
            "customer_count": len(cust_rows)
        }

    def _write_csv(self, file_path: Path, latest_path: Path, rows: List[Dict[str, Any]]) -> None:
        if not rows:
            return
        fieldnames = list(rows[0].keys())
        with open(file_path, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        with open(latest_path, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
