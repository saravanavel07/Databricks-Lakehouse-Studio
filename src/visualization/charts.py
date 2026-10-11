"""
Visualization Helpers
Provides standard chart definitions and metrics visual representations.
"""
from typing import Dict, Any, List

def format_currency(value: float) -> str:
    return f"${value:,.2f}"

def format_number(value: int) -> str:
    return f"{value:,}"

def format_percentage(value: float) -> str:
    return f"{value:.1f}%"
