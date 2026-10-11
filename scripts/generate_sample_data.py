"""
Sample Data Generator
Generates realistic e-commerce retail transactions with intentional edge cases for data quality demonstration.
"""
from pathlib import Path
import csv
import sys

# Ensure root is in python path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))
import config

SAMPLE_ROWS = [
    ["ORD-1001", "2026-03-01", "CUST-201", "Alice Chen", "alice.chen@example.com", "North America", "PROD-10", "Electronics", "Pro ANC Wireless Headphones", "199.99", "2", "0.05", "9.99", "Credit Card", "DELIVERED"],
    ["ORD-1002", "2026-03-01", "CUST-202", "Brian Patel", "brian.p@example.com", "Europe", "PROD-14", "Electronics", "4K Ergonomic Monitor 27in", "349.50", "1", "0.00", "14.50", "PayPal", "DELIVERED"],
    ["ORD-1003", "2026-03-02", "CUST-203", "Carla Gomez", "", "Latin America", "PROD-30", "Office Supplies", "Ergonomic Mesh Chair", "220.00", "1", "0.10", "25.00", "Credit Card", "DELIVERED"],
    ["ORD-1004", "2026-03-02", "CUST-204", "David Kim", "david.kim@example.com", "Asia Pacific", "PROD-12", "Electronics", "Mechanical RGB Keyboard", "129.99", "3", "0.15", "12.00", "Credit Card", "DELIVERED"],
    ["ORD-1005", "2026-03-03", "CUST-205", "Emma Watson", "emma.w@example.com", "Europe", "PROD-50", "Furniture", "Electric Standing Desk", "480.00", "1", "0.00", "35.00", "Bank Transfer", "DELIVERED"],
    ["ORD-1006", "2026-03-03", "CUST-201", "Alice Chen", "alice.chen@example.com", "North America", "PROD-15", "Electronics", "USB-C Docking Hub Triple Display", "89.00", "2", "0.00", "5.50", "Credit Card", "DELIVERED"],
    ["ORD-1007", "2026-03-04", "CUST-206", "Fiona Gallagher", "fiona@invalid-domain", "North America", "PROD-22", "Accessories", "Leather Laptop Sleeve 15in", "45.00", "1", "0.00", "4.99", "PayPal", "SHIPPED"],
    ["ORD-1008", "2026-03-04", "CUST-207", "George Clark", "george.c@example.com", "Middle East", "PROD-10", "Electronics", "Pro ANC Wireless Headphones", "199.99", "1", "0.00", "18.00", "Credit Card", "DELIVERED"],
    ["ORD-1009", "2026-03-05", "CUST-208", "Hannah Abbott", "hannah@example.com", "North America", "PROD-40", "Storage", "Portable 2TB NVMe SSD", "159.00", "4", "0.20", "8.00", "Credit Card", "DELIVERED"],
    ["ORD-1010", "2026-03-05", "CUST-209", "Ian Malcolm", "ian.m@example.com", "Europe", "PROD-14", "Electronics", "4K Ergonomic Monitor 27in", "349.50", "2", "0.05", "20.00", "PayPal", "DELIVERED"],
    ["ORD-1002", "2026-03-01", "CUST-202", "Brian Patel", "brian.p@example.com", "Europe", "PROD-14", "Electronics", "4K Ergonomic Monitor 27in", "349.50", "1", "0.00", "14.50", "PayPal", "DELIVERED"], # Duplicate row
    ["ORD-1011", "2026-03-06", "CUST-210", "Julia Roberts", "julia@example.com", "North America", "PROD-32", "Office Supplies", "High-Yield Toner Cartridge", "75.00", "5", "0.10", "12.50", "Credit Card", "DELIVERED"],
    ["ORD-1012", "2026-03-06", "CUST-211", "Kenji Sato", "kenji.s@example.com", "Asia Pacific", "PROD-10", "Electronics", "Pro ANC Wireless Headphones", "199.99", "1", "0.00", "15.00", "Bank Transfer", "CANCELLED"],
    ["ORD-1013", "2026-03-07", "CUST-212", "Laura Dern", "laura@example.com", "Latin America", "PROD-25", "Accessories", "Aluminum Monitor Riser", "39.99", "-1", "0.00", "6.00", "Credit Card", "DELIVERED"], # Negative quantity
    ["ORD-1014", "INVALID_DATE", "CUST-213", "Marcus Aurelius", "marcus@example.com", "Europe", "PROD-12", "Electronics", "Mechanical RGB Keyboard", "129.99", "1", "0.00", "11.00", "PayPal", "DELIVERED"], # Invalid date
    ["ORD-1015", "2026-03-08", "CUST-214", "Nadia Ali", "nadia@example.com", "Middle East", "PROD-50", "Furniture", "Electric Standing Desk", "480.00", "2", "0.10", "40.00", "Credit Card", "DELIVERED"],
    ["ORD-1016", "2026-03-08", "CUST-215", "Oliver Queen", "oliver@example.com", "North America", "PROD-40", "Storage", "Portable 2TB NVMe SSD", "159.00", "1", "0.00", "7.50", "Credit Card", "DELIVERED"],
    ["ORD-1017", "2026-03-09", "CUST-216", "Patricia Hill", "patricia@example.com", "Europe", "PROD-15", "Electronics", "USB-C Docking Hub Triple Display", "89.00", "3", "0.05", "8.00", "Credit Card", "DELIVERED"],
    ["ORD-1018", "2026-03-09", "CUST-217", "Quinn Fabray", "quinn@example.com", "North America", "PROD-22", "Accessories", "Leather Laptop Sleeve 15in", "-45.00", "2", "0.00", "5.00", "PayPal", "DELIVERED"], # Negative price
    ["ORD-1019", "2026-03-10", "CUST-218", "Rajesh Koothrappali", "raj@example.com", "Asia Pacific", "PROD-14", "Electronics", "4K Ergonomic Monitor 27in", "349.50", "1", "0.00", "22.00", "Credit Card", "DELIVERED"],
    ["ORD-1020", "2026-03-10", "CUST-219", "Sara Lance", "sara@example.com", "North America", "PROD-30", "Office Supplies", "Ergonomic Mesh Chair", "220.00", "2", "0.15", "30.00", "Credit Card", "DELIVERED"],
    ["ORD-1021", "2026-03-11", "CUST-220", "Thomas Shelby", "thomas@example.com", "Europe", "PROD-10", "Electronics", "Pro ANC Wireless Headphones", "199.99", "5", "0.20", "25.00", "Bank Transfer", "DELIVERED"],
    ["ORD-1022", "2026-03-11", "CUST-221", "Uma Thurman", "uma@example.com", "North America", "PROD-12", "Electronics", "Mechanical RGB Keyboard", "129.99", "2", "0.00", "10.00", "Credit Card", "DELIVERED"],
    ["ORD-1023", "2026-03-12", "CUST-222", "Victor Stone", "victor@example.com", "North America", "PROD-50", "Furniture", "Electric Standing Desk", "480.00", "1", "0.00", "35.00", "Credit Card", "DELIVERED"],
    ["ORD-1024", "2026-03-12", "CUST-223", "Wanda Maximoff", "wanda@example.com", "Europe", "PROD-40", "Storage", "Portable 2TB NVMe SSD", "159.00", "2", "0.05", "9.00", "PayPal", "DELIVERED"]
]

def main():
    target_path = config.DATA_DIR / "sample_sales.csv"
    with open(target_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(config.EXPECTED_COLUMNS)
        writer.writerows(SAMPLE_ROWS)
    print(f"Generated sample dataset with {len(SAMPLE_ROWS)} records at {target_path}")

if __name__ == "__main__":
    main()
