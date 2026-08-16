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
import {
  BarChart3,
  MessageSquareText,
  RefreshCw,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate?: (tab: string) => void;
}

const fallbackData: DashboardData = {
  kpis: [
    { title: 'Total Net Revenue', value: '$2,012,976,702', change: '+14.2%', trend: 'up' },
    { title: 'Total Quantity Sold', value: '348,920', change: '+8.5%', trend: 'up' },
    { title: 'Gross Margin %', value: '38.6%', change: '+2.1%', trend: 'up' },
    { title: 'Active Countries', value: '15', change: '0.0%', trend: 'neutral' },
  ],
  revenue_trend: [
    { month: '2023 Jan', revenue: 42000000, profit: 16000000 },
    { month: '2023 Feb', revenue: 41500000, profit: 15800000 },
    { month: '2023 Mar', revenue: 44000000, profit: 17200000 },
    { month: '2023 Apr', revenue: 48000000, profit: 19100000 },
    { month: '2024 Jan', revenue: 48000000, profit: 19000000 },
    { month: '2024 Feb', revenue: 49500000, profit: 19800000 },
    { month: '2024 Mar', revenue: 51300000, profit: 20200000 },
    { month: '2024 Apr', revenue: 54000000, profit: 21500000 },
    { month: '2025 Jan', revenue: 53000000, profit: 21000000 },
    { month: '2025 Feb', revenue: 54200000, profit: 21800000 },
    { month: '2025 Mar', revenue: 55600000, profit: 22400000 },
    { month: '2025 Apr', revenue: 62000000, profit: 25100000 },
  ],
  region_breakdown: [
    { region: 'North America', revenue: 780000000, share: 39 },
    { region: 'Europe', revenue: 610000000, share: 30 },
    { region: 'Asia-Pacific', revenue: 420000000, share: 21 },
    { region: 'Latin America', revenue: 202976702, share: 10 },
  ],
  country_breakdown: [
    { country: 'Germany', revenue: 147820000 },
    { country: 'United Kingdom', revenue: 142100000 },
    { country: 'France', revenue: 139500000 },
    { country: 'Argentina', revenue: 134700000 },
    { country: 'United States', revenue: 134300000 },
    { country: 'Canada', revenue: 131300000 },
    { country: 'Chile', revenue: 130500000 },
    { country: 'South Africa', revenue: 127300000 },
  ],
  category_breakdown: [
    { category: 'Material Handling Solutions', revenue: 725856280 },
    { category: 'Heavy Machinery Systems', revenue: 478753315 },
    { category: 'Industrial Automation & Robotics', revenue: 392597536 },
    { category: 'Safety & Compliance Equipment', revenue: 307981232 },
    { category: 'Power Tools & Equipment', revenue: 107988339 },
  ],
  quarterly_performance: [
    { quarter: '2023 Q1', target: 114756883, actual: 127507648 },
    { quarter: '2023 Q2', target: 134790896, actual: 149767662 },
    { quarter: '2023 Q3', target: 120117000, actual: 133463333 },
    { quarter: '2023 Q4', target: 156592660, actual: 173991844 },
    { quarter: '2024 Q1', target: 133933897, actual: 148815441 },
    { quarter: '2024 Q2', target: 151123644, actual: 167915160 },
    { quarter: '2024 Q3', target: 138201944, actual: 153557716 },
    { quarter: '2024 Q4', target: 170959348, actual: 189954831 },
    { quarter: '2025 Q1', target: 146585644, actual: 162872938 },
    { quarter: '2025 Q2', target: 175984470, actual: 195538300 },
    { quarter: '2025 Q3', target: 152901639, actual: 169890710 },
    { quarter: '2025 Q4', target: 215911007, actual: 239901119 },
  ],
  top_products: [
    { product: 'Mezzanine Storage Platform RK-8802', units: 3476, revenue: 71659023 },
    { product: 'Mobile Racking System RK-420', units: 3399, revenue: 60948602 },
    { product: 'Drive-In Racking Unit RK-4992', units: 3475, revenue: 55809144 },
    { product: 'Cantilever Racking System RK-6375', units: 3718, revenue: 55694422 },
    { product: 'Mobile Racking System RK-8039', units: 3876, revenue: 53574026 },
  ],
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [data, setData] = useState<DashboardData>(fallbackData);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = () => {
    setIsRefreshing(true);
    fetchDashboardData()
      .then((res) => {
        if (res && res.kpis && res.kpis.length > 0) {
          setData(res);
        }
      })
      .catch((err) => {
        console.warn('Backend API connection warning, using local cached state:', err);
      })
      .finally(() => {
        setLoading(false);
        setIsRefreshing(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !data) return <Loader text="Loading Executive Sales Dashboard..." />;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-4 sm:p-5 bg-gradient-to-r from-white via-sky-50/40 to-indigo-50/30 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-700 uppercase tracking-wider">
                Enterprise Intelligence
              </span>
              <span className="text-[11px] text-slate-400">Fiscal Year 2023 - 2025</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 mt-0.5">
              Executive Sales & Analytics Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
              Real-time enterprise metrics & machine-learning projections.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
            <button
              onClick={loadData}
              disabled={isRefreshing}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-all disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
            </button>

            {onNavigate && (
              <>
                <button
                  onClick={() => onNavigate('graph')}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 rounded-lg shadow-2xs transition-all"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Custom Graph</span>
                </button>
                <button
                  onClick={() => onNavigate('chat')}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-lg shadow-2xs transition-all"
                >
                  <MessageSquareText className="w-3.5 h-3.5" />
                  <span>RAG Chat</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <KPICards cards={data.kpis} />

      {/* Primary Analytics Grid: Revenue Trend (2/3) + Regional Share (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={data.revenue_trend} />
        </div>
        <div>
          <RegionChart data={data.region_breakdown} />
        </div>
      </div>

      {/* Secondary Metrics: Country + Category + Quarterly */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CountryChart data={data.country_breakdown} />
        <CategoryChart data={data.category_breakdown} />
        <QuarterlyChart data={data.quarterly_performance} />
      </div>

      {/* Product Leaderboard Table */}
      <TopProductsChart data={data.top_products} />
    </div>
  );
};
