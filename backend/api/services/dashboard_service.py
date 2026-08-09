from typing import Dict, Any, List
from api.services.data_service import data_service
from api.utils.logger import get_logger

logger = get_logger("services.dashboard_service")

class DashboardService:
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get dashboard data from preprocessed Excel file (cached in session)."""
        kpis = data_service.get_kpis()
        
        # Format KPIs for frontend
        formatted_kpis = [
            {"title": "Total Net Revenue", "value": f"${kpis['total_revenue']:,.0f}", "change": "+14.2%", "trend": "up"},
            {"title": "Total Quantity Sold", "value": f"{kpis['total_quantity']:,}", "change": "+8.5%", "trend": "up"},
            {"title": "Gross Margin", "value": f"{kpis['avg_margin']:.1f}%", "change": "+2.1%", "trend": "up"},
            {"title": "Active Countries", "value": str(kpis['country_count']), "change": "0.0%", "trend": "neutral"}
        ]
        
        return {
            "kpis": formatted_kpis,
            "revenue_trend": data_service.get_revenue_trend(),
            "region_breakdown": data_service.get_region_breakdown(),
            "country_breakdown": data_service.get_country_breakdown(),
            "category_breakdown": data_service.get_category_breakdown(),
            "quarterly_performance": data_service.get_quarterly_performance(),
            "top_products": data_service.get_top_products()
        }

dashboard_service = DashboardService()
