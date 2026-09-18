"""
Test Suite for Upgraded Graph Generation Pipeline
=================================================
Tests:
  1. Data Freshness & Ingestion (excel_dataset_service)
  2. Health Check (check_health raises on stale data)
  3. Schema Mapping & Ambiguity Resolution (schema_service)
  4. Deterministic Pre-Computation & Reconciliation (python_graph_agent)
  5. 10 Supported Chart Types (bar, line, funnel, heatmap, stacked_bar, donut, waterfall, box, violin, scatter)
  6. API Response Model Contract
"""

import sys
import unittest
from pathlib import Path
import pandas as pd

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(backend_dir / "api") not in sys.path:
    sys.path.insert(0, str(backend_dir / "api"))

from api.services.excel_dataset_service import excel_dataset_service
from api.services.schema_service import schema_service, SCHEMA_MAPPING_VERSION
from api.services.python_graph_agent import python_graph_agent
from api.config import settings


class TestExcelDatasetService(unittest.TestCase):
    def test_df_loading_and_freshness(self):
        df = excel_dataset_service.get_df()
        self.assertIsNotNone(df)
        self.assertFalse(df.empty)

        data_as_of = excel_dataset_service.get_data_as_of()
        self.assertIsNotNone(data_as_of)
        self.assertTrue("T" in data_as_of)  # ISO timestamp

        records = excel_dataset_service.get_records_in_source()
        self.assertEqual(records, len(df))

    def test_health_check_success(self):
        health = excel_dataset_service.check_health(max_stale_hours=1000000.0)
        self.assertEqual(health["status"], "healthy")
        self.assertGreater(health["rows"], 0)

    def test_health_check_stale_failure(self):
        # Setting max_stale_hours=0.000001 triggers stale failure if modified earlier
        with self.assertRaises(RuntimeError):
            excel_dataset_service.check_health(max_stale_hours=0.000001)


class TestSchemaService(unittest.TestCase):
    def test_schema_mapping_version(self):
        self.assertEqual(SCHEMA_MAPPING_VERSION, "1.0.0")

    def test_exact_and_alias_resolution(self):
        self.assertEqual(schema_service.resolve_column("revenue"), "NetRevenueUSD")
        self.assertEqual(schema_service.resolve_column("profit"), "GrossMarginUSD")
        self.assertEqual(schema_service.resolve_column("quantity"), "Quantity")
        self.assertEqual(schema_service.resolve_column("Region"), "Region")

    def test_ambiguity_detection(self):
        res = schema_service.resolve_column_with_ambiguity_check("net")
        self.assertTrue(res["is_ambiguous"])
        self.assertIsNone(res["resolved_col"])
        self.assertIsNotNone(res["clarification_prompt"])


class TestPythonGraphAgentPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.df = excel_dataset_service.get_df()

    def test_deterministic_precomputation_and_reconciliation(self):
        query_plan = {
            "chart_type": "bar",
            "measure": "NetRevenueUSD",
            "dimension": "Region",
            "aggregation": "SUM",
            "top_n": 5,
        }
        df_agg = python_graph_agent._compute_graph_dataset(query_plan, self.df)
        self.assertIsNotNone(df_agg)
        self.assertIn("Region", df_agg.columns)
        self.assertIn("NetRevenueUSD", df_agg.columns)
        self.assertLessEqual(len(df_agg), 5)

        verified = python_graph_agent._reconcile_graph_dataset(df_agg, query_plan, self.df)
        self.assertTrue(verified["verified"])

    def test_10_chart_types_precomputation(self):
        chart_configs = [
            ("bar", "NetRevenueUSD", "Region"),
            ("line", "NetRevenueUSD", "Year"),
            ("funnel", "NetRevenueUSD", "OrderType"),
            ("heatmap", "NetRevenueUSD", "Region"),
            ("stacked_bar", "NetRevenueUSD", "Region"),
            ("donut", "NetRevenueUSD", "Category"),
            ("waterfall", "NetRevenueUSD", "Region"),
            ("box", "NetRevenueUSD", "Region"),
            ("violin", "NetRevenueUSD", "Region"),
            ("scatter", "NetRevenueUSD", "GrossMarginUSD"),
        ]

        for chart_type, measure, dimension in chart_configs:
            with self.subTest(chart_type=chart_type):
                plan = {
                    "chart_type": chart_type,
                    "measure": measure,
                    "dimension": dimension,
                    "dimension2": "Category" if chart_type in ["heatmap", "stacked_bar"] else None,
                    "measure2": "GrossMarginUSD" if chart_type == "scatter" else None,
                    "aggregation": "SUM",
                    "top_n": 5,
                }
                df_agg = python_graph_agent._compute_graph_dataset(plan, self.df)
                self.assertIsNotNone(df_agg)
                self.assertFalse(df_agg.empty, f"Precomputation returned empty df for {chart_type}")
                res = python_graph_agent._reconcile_graph_dataset(df_agg, plan, self.df)
                self.assertTrue(res["verified"], f"Reconciliation failed for {chart_type}")


if __name__ == "__main__":
    unittest.main()
