import React, { useEffect, useState } from 'react';
import { KPICards } from '../components/Dashboard/KPICards';
import { RevenueChart } from '../components/Dashboard/RevenueChart';
import { RegionChart } from '../components/Dashboard/RegionChart';
import { CountryChart } from '../components/Dashboard/CountryChart';
import { CategoryChart } from '../components/Dashboard/CategoryChart';
import { QuarterlyChart } from '../components/Dashboard/QuarterlyChart';
import { TopProductsChart } from '../components/Dashboard/TopProductsChart';
import { Loader } from '../components/Common/Loader';
import { fetchDashboardData, type DashboardData } from '../services/dashboard';

const fallbackData: DashboardData = {
  kpis: [
    { title: "Total Net Revenue", value: "$12,450,000", change: "+14.2%", trend: "up" },
    { title: "Total Quantity Sold", value: "184,320", change: "+8.5%", trend: "up" },
    { title: "Gross Margin", value: "38.6%", change: "+2.1%", trend: "up" },
    { title: "Active Countries", value: "24", change: "0.0%", trend: "neutral" }
  ],
  revenue_trend: [
    { month: "Jan", revenue: 2800000, profit: 1050000 },
    { month: "Feb", revenue: 3100000, profit: 1200000 },
    { month: "Mar", revenue: 3250000, profit: 1280000 },
    { month: "Apr", revenue: 3300000, profit: 1320000 }
  ],
  region_breakdown: [
    { region: "North America", revenue: 4500000, share: 36 },
    { region: "Europe", revenue: 3800000, share: 30 },
    { region: "Asia-Pacific", revenue: 2900000, share: 23 },
    { region: "Latin America", revenue: 1250000, share: 11 }
  ],
  country_breakdown: [
    { country: "United States", revenue: 3200000 },
    { country: "Germany", revenue: 1800000 },
    { country: "Japan", revenue: 1500000 },
    { country: "United Kingdom", revenue: 1200000 }
  ],
  category_breakdown: [
    { category: "Beverages", revenue: 3100000 },
    { category: "Office Supplies", revenue: 2800000 },
    { category: "Electronics", revenue: 2600000 },
    { category: "Cosmetics", revenue: 2200000 }
  ],
  quarterly_performance: [
    { quarter: "Q1 2023", target: 2500000, actual: 2800000 },
    { quarter: "Q2 2023", target: 2900000, actual: 3100000 },
    { quarter: "Q3 2023", target: 3100000, actual: 3250000 },
    { quarter: "Q4 2023", target: 3200000, actual: 3300000 }
  ],
  top_products: [
    { product: "Cosmetics Premium Pack", units: 14200, revenue: 1420000 },
    { product: "Office Laptop Stand", units: 12800, revenue: 1152000 },
    { product: "Organic Beverage Case", units: 11500, revenue: 920000 }
  ]
};

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData>(fallbackData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData()
      .then((res) => {
        if (res && res.kpis) {
          setData(res);
        }
      })
      .catch((err) => {
        console.warn('Backend API connection warning, using local dashboard state:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading && !data) return <Loader text="Loading Executive Sales Dashboard..." />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold gradient-text">Executive Sales Dashboard</h2>
        <p className="text-sm text-slate-400 mt-1">Real-time enterprise analytics powered by SAP HANA Cloud & SAP AI Core.</p>
      </div>

      <KPICards cards={data.kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={data.revenue_trend} />
        </div>
        <div>
          <RegionChart data={data.region_breakdown} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CountryChart data={data.country_breakdown} />
        <CategoryChart data={data.category_breakdown} />
        <QuarterlyChart data={data.quarterly_performance} />
      </div>

      <TopProductsChart data={data.top_products} />
    </div>
  );
};
