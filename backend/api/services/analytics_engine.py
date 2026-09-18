"""
Analytics Engine — Deterministic Structured Query Executor
============================================================
Executes validated query plans against the Pandas DataFrame.
All calculations are deterministic — no LLM involved.
"""

import time
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from api.services.data_service import data_service
from api.services.schema_service import schema_service
from api.utils.logger import get_logger

logger = get_logger("services.analytics_engine")


class AnalyticsResult:
    """Structured result from an analytics query."""

    def __init__(self):
        self.success: bool = False
        self.data: List[Dict[str, Any]] = []
        self.summary: Dict[str, Any] = {}
        self.records_matched: int = 0
        self.records_total: int = 0
        self.execution_time_ms: float = 0
        self.error: Optional[str] = None
        self.warnings: List[str] = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "data": self.data,
            "summary": self.summary,
            "records_matched": self.records_matched,
            "records_total": self.records_total,
            "execution_time_ms": round(self.execution_time_ms, 2),
            "error": self.error,
            "warnings": self.warnings,
        }


class AnalyticsEngine:
    """
    Executes structured query plans against the in-memory DataFrame.
    Supports filtering, aggregation, sorting, ranking, and comparisons.
    """

    def execute(self, query_plan: Dict[str, Any]) -> AnalyticsResult:
        """
        Execute a validated query plan and return structured results.
        """
        result = AnalyticsResult()
        start_time = time.time()

        try:
            df = data_service.get_dataframe()
            if df.empty:
                result.error = "Dataset is empty. Please upload a dataset first."
                return result

            result.records_total = len(df)

            # 1. Apply filters
            filtered_df = self._apply_filters(df, query_plan, result)
            if filtered_df.empty:
                result.error = "No records match the applied filters."
                result.records_matched = 0
                result.success = True  # Valid query, just no data
                return result

            result.records_matched = len(filtered_df)

            # 2. Execute based on intent
            intent = query_plan.get("intent", "analytical")
            metric = query_plan.get("metric", "NetRevenueUSD")
            dimension = query_plan.get("dimension")
            aggregation = query_plan.get("aggregation", "SUM")
            limit = query_plan.get("limit")
            sort = query_plan.get("sort")

            if intent in ("analytical", "ranking", "graph", "comparison"):
                if dimension:
                    # GROUP BY aggregation
                    result.data = self._aggregate_by_dimension(
                        filtered_df, metric, dimension, aggregation, limit, sort
                    )
                else:
                    # Scalar aggregation
                    scalar = self._scalar_aggregate(filtered_df, metric, aggregation)
                    result.data = [{"metric": metric, "aggregation": aggregation, "value": scalar}]
                    result.summary = {
                        "metric": metric,
                        "aggregation": aggregation,
                        "value": scalar,
                        "formatted_value": self._format_value(scalar, metric),
                    }
            else:
                # Raw data (chat with structured query)
                result.data = self._get_raw_data(filtered_df, limit or 20)

            result.success = True

        except Exception as e:
            logger.error(f"[AnalyticsEngine] Execution error: {e}")
            result.error = str(e)

        result.execution_time_ms = (time.time() - start_time) * 1000
        return result

    # ── Filtering ─────────────────────────────────────────────────────────────

    def _apply_filters(self, df: pd.DataFrame, plan: Dict[str, Any],
                       result: AnalyticsResult) -> pd.DataFrame:
        """Apply all filters from the query plan."""
        filtered = df.copy()

        # Apply explicit filters
        for f in plan.get("filters", []):
            filtered = self._apply_single_filter(filtered, f, result)

        # Apply date filter
        date_filter = plan.get("date_filter")
        if date_filter:
            filtered = self._apply_date_filter(filtered, date_filter, result)

        return filtered

    def _apply_single_filter(self, df: pd.DataFrame, f: Dict[str, Any],
                             result: AnalyticsResult) -> pd.DataFrame:
        """Apply a single filter condition."""
        col = f.get("column")
        op = f.get("operator", "=")
        val = f.get("value")

        if col not in df.columns:
            result.warnings.append(f"Filter column '{col}' not found in dataset.")
            return df

        try:
            if op == "=":
                if pd.api.types.is_numeric_dtype(df[col]):
                    return df[df[col] == float(val)]
                else:
                    # Case-insensitive string match
                    return df[df[col].astype(str).str.lower() == str(val).lower()]
            elif op == "!=":
                return df[df[col].astype(str).str.lower() != str(val).lower()]
            elif op == ">":
                return df[df[col] > float(val)]
            elif op == "<":
                return df[df[col] < float(val)]
            elif op == ">=":
                return df[df[col] >= float(val)]
            elif op == "<=":
                return df[df[col] <= float(val)]
            elif op == "IN":
                if isinstance(val, list):
                    if pd.api.types.is_numeric_dtype(df[col]):
                        # Numeric IN filter — cast values to the column's type
                        try:
                            numeric_vals = [float(v) for v in val]
                            if pd.api.types.is_integer_dtype(df[col]):
                                numeric_vals = [int(v) for v in numeric_vals]
                            return df[df[col].isin(numeric_vals)]
                        except (ValueError, TypeError):
                            pass
                    # String IN filter — case-insensitive
                    vals_lower = [str(v).lower() for v in val]
                    return df[df[col].astype(str).str.lower().isin(vals_lower)]
                return df
            elif op == "CONTAINS":
                return df[df[col].astype(str).str.contains(str(val), case=False, na=False)]
            else:
                result.warnings.append(f"Unknown operator '{op}' for filter on '{col}'.")
                return df
        except Exception as e:
            result.warnings.append(f"Error applying filter on '{col}': {e}")
            return df

    def _apply_date_filter(self, df: pd.DataFrame, date_filter: Dict[str, Any],
                          result: AnalyticsResult) -> pd.DataFrame:
        """Apply a date/time filter."""
        col = date_filter.get("column", "Year")
        from_val = date_filter.get("from")
        to_val = date_filter.get("to")

        if col not in df.columns:
            result.warnings.append(f"Date column '{col}' not found.")
            return df

        try:
            if col == "Year":
                if from_val:
                    df = df[df["Year"] >= int(from_val)]
                if to_val:
                    df = df[df["Year"] <= int(to_val)]
            elif col == "Quarter":
                # Quarter values like "Q1", "Q2", etc.
                if from_val and to_val and from_val == to_val:
                    df = df[df["Quarter"] == from_val]
            elif col == "OrderDate":
                if from_val:
                    df = df[pd.to_datetime(df["OrderDate"], errors="coerce") >= pd.to_datetime(from_val)]
                if to_val:
                    df = df[pd.to_datetime(df["OrderDate"], errors="coerce") <= pd.to_datetime(to_val)]
        except Exception as e:
            result.warnings.append(f"Error applying date filter: {e}")

        return df

    # ── Aggregation ───────────────────────────────────────────────────────────

    def _aggregate_by_dimension(self, df: pd.DataFrame, metric: str, dimension: str,
                                aggregation: str, limit: Optional[int] = None,
                                sort: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Group by dimension and aggregate the metric. Supports composite dimensions."""
        if metric not in df.columns:
            raise ValueError(f"Metric column '{metric}' not found. Available numeric columns: "
                           f"{', '.join(schema_service.get_measures())}")

        # Detect composite dimension (e.g. "Year, Quarter" or "Year, MonthName")
        is_composite = ", " in dimension
        if is_composite:
            dim_parts = [d.strip() for d in dimension.split(",")]
            for part in dim_parts:
                if part not in df.columns:
                    raise ValueError(f"Dimension column '{part}' not found in dataset.")

            # Group by multiple columns
            agg_func = self._get_agg_func(aggregation)
            grouped = df.groupby(dim_parts, dropna=True)[metric].agg(agg_func).reset_index()

            # Clean NaN
            grouped = grouped.dropna(subset=[metric])

            # Chronological sorting for Year+Quarter or Year+MonthName
            if "Year" in dim_parts and "Quarter" in dim_parts:
                grouped["_qnum"] = grouped["Quarter"].astype(str).str.extract(r'(\d+)').fillna(0).astype(int)
                grouped = grouped.sort_values(["Year", "_qnum"])
                grouped.drop(columns=["_qnum"], inplace=True)
            elif "Year" in dim_parts and "MonthName" in dim_parts:
                month_order = {
                    "January": 1, "February": 2, "March": 3, "April": 4,
                    "May": 5, "June": 6, "July": 7, "August": 8,
                    "September": 9, "October": 10, "November": 11, "December": 12,
                }
                grouped["_mnum"] = grouped["MonthName"].map(month_order).fillna(0).astype(int)
                grouped = grouped.sort_values(["Year", "_mnum"])
                grouped.drop(columns=["_mnum"], inplace=True)
            elif sort:
                sort_col = sort.get("column", metric)
                if sort_col not in grouped.columns:
                    sort_col = metric
                ascending = sort.get("direction", "DESC") == "ASC"
                grouped = grouped.sort_values(sort_col, ascending=ascending)

            # Apply limit
            if limit and limit > 0:
                grouped = grouped.head(limit)

            # Build combined period label and return records
            label_col = " ".join(dim_parts)  # e.g. "Year Quarter"
            records = []
            for _, row in grouped.iterrows():
                label = " ".join(str(row[p]) for p in dim_parts)
                record = {
                    label_col: label,
                    metric: float(row[metric]) if pd.notna(row[metric]) else 0,
                    "formatted_value": self._format_value(row[metric], metric),
                }
                # Also include individual dimension values for downstream consumers
                for p in dim_parts:
                    record[p] = str(row[p])
                records.append(record)
            return records

        # Single dimension path (original logic)
        if dimension not in df.columns:
            raise ValueError(f"Dimension column '{dimension}' not found. Available dimensions: "
                           f"{', '.join(schema_service.get_dimensions())}")

        # Perform aggregation
        agg_func = self._get_agg_func(aggregation)
        grouped = df.groupby(dimension, dropna=True)[metric].agg(agg_func).reset_index()
        grouped.columns = [dimension, metric]

        # Clean NaN
        grouped = grouped.dropna(subset=[metric])

        # Sort
        if sort:
            sort_col = sort.get("column", metric)
            if sort_col not in grouped.columns:
                sort_col = metric
            ascending = sort.get("direction", "DESC") == "ASC"
            grouped = grouped.sort_values(sort_col, ascending=ascending)
        else:
            grouped = grouped.sort_values(metric, ascending=False)

        # Apply limit
        if limit and limit > 0:
            grouped = grouped.head(limit)

        # Convert to list of dicts
        records = []
        for _, row in grouped.iterrows():
            records.append({
                dimension: str(row[dimension]),
                metric: float(row[metric]) if pd.notna(row[metric]) else 0,
                "formatted_value": self._format_value(row[metric], metric),
            })
        return records

    def _scalar_aggregate(self, df: pd.DataFrame, metric: str, aggregation: str) -> float:
        """Perform a scalar aggregation (no grouping)."""
        if metric not in df.columns:
            raise ValueError(f"Metric column '{metric}' not found. Available: "
                           f"{', '.join(schema_service.get_measures())}")

        series = df[metric].dropna()
        agg_func = self._get_agg_func(aggregation)

        if aggregation == "COUNT":
            return float(len(series))
        elif aggregation == "COUNT_DISTINCT":
            return float(series.nunique())
        else:
            return float(series.agg(agg_func))

    def _get_agg_func(self, aggregation: str) -> str:
        """Map aggregation name to pandas function."""
        mapping = {
            "SUM": "sum", "AVG": "mean", "COUNT": "count",
            "MIN": "min", "MAX": "max", "COUNT_DISTINCT": "nunique",
        }
        return mapping.get(aggregation, "sum")

    # ── Raw Data ──────────────────────────────────────────────────────────────

    def _get_raw_data(self, df: pd.DataFrame, limit: int = 20) -> List[Dict[str, Any]]:
        """Return raw data rows (limited)."""
        rows = df.head(limit)
        records = []
        for _, row in rows.iterrows():
            record = {}
            for col in df.columns:
                val = row[col]
                if pd.isna(val):
                    record[col] = None
                elif isinstance(val, (np.integer,)):
                    record[col] = int(val)
                elif isinstance(val, (np.floating,)):
                    record[col] = float(val)
                else:
                    record[col] = str(val)
            records.append(record)
        return records

    # ── Formatting ────────────────────────────────────────────────────────────

    def _format_value(self, value: Any, column: str) -> str:
        """Format a value for display based on its column type."""
        if value is None or (isinstance(value, float) and np.isnan(value)):
            return "N/A"

        try:
            v = float(value)
        except (TypeError, ValueError):
            return str(value)

        # Currency columns
        currency_cols = {"NetRevenueUSD", "TotalCostUSD", "GrossMarginUSD",
                        "UnitListPriceUSD", "NetUnitPriceUSD", "UnitCostUSD",
                        "NetRevenueLocalCurrency"}
        if column in currency_cols:
            if abs(v) >= 1_000_000:
                return f"${v / 1_000_000:,.2f}M"
            elif abs(v) >= 1_000:
                return f"${v / 1_000:,.2f}K"
            return f"${v:,.2f}"

        # Percentage columns
        pct_cols = {"DiscountPercent", "GrossMarginPercent"}
        if column in pct_cols:
            return f"{v:.1f}%"

        # Integer columns
        if column == "Quantity":
            return f"{int(v):,}"

        return f"{v:,.2f}"


analytics_engine = AnalyticsEngine()
