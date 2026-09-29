import React, { useState, useEffect } from 'react';
import {
  TOP_PRODUCTS,
  REGIONAL_MARKET_SHARE,
  TOP_REVENUE_COUNTRIES,
  PRODUCT_CATEGORIES,
  QUARTERLY_TARGETS,
  ProductSKU,
} from '../data/mockData';
import { fetchDashboardData, DashboardData } from '../services/dashboardService';

interface ExecutiveDashboardProps {
  onNavigate: (path: string) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ onNavigate }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'All' | '2025' | '2024' | '2023'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncTime, setSyncTime] = useState('Loading...');
  const [activeChartMonth, setActiveChartMonth] = useState<number>(-1);
  const [fullCatalogueOpen, setFullCatalogueOpen] = useState(false);

  // ── Live Backend Data ──────────────────────────────────────────────────────
  const [liveData, setLiveData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const loadDashboardData = async () => {
    setSyncing(true);
    try {
      const data = await fetchDashboardData();
      setLiveData(data);
      setSyncTime('Just now');
      // Set active chart month to last available month
      if (data.revenue_trend.length > 0 && activeChartMonth < 0) {
        setActiveChartMonth(data.revenue_trend.length - 1);
      }
    } catch (err) {
      console.error('Dashboard fetch failed, using mock data:', err);
      setSyncTime('Offline – using cached data');
    } finally {
      setSyncing(false);
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleSync = () => loadDashboardData();

  // ── Derived data from live backend or mock fallback ─────────────────────
  const kpis = liveData?.kpis ?? [
    { title: 'Total Net Revenue', value: '$184.2M', change: '+14.8%', trend: 'up' as const },
    { title: 'Total Quantity Sold', value: '1,420,890', change: '+8.2%', trend: 'up' as const },
    { title: 'Gross Margin', value: '42.6%', change: '+2.4%', trend: 'up' as const },
    { title: 'Active Countries', value: '15', change: '0.0%', trend: 'neutral' as const },
  ];

  const periodMultiplier = {
    rev: kpis[0]?.value ?? '$0',
    profit: liveData ? `$${(liveData.revenue_trend.reduce((s, m) => s + m.profit, 0) / 1e6).toFixed(1)}M` : '$78.5M',
    margin: kpis[2]?.value ?? '0%',
    qty: kpis[1]?.value ?? '0',
  };

  // Revenue trend chart data
  const rawTrend = liveData?.revenue_trend ?? [];
  const maxRev = Math.max(...rawTrend.map(m => m.revenue), 1);
  const chartWidth = 680;
  const chartHeight = 170;
  const topPad = 20;
  const monthlyData = rawTrend.length > 0
    ? rawTrend.map((m, i) => {
        const x = rawTrend.length > 1 ? topPad + (i / (rawTrend.length - 1)) * (chartWidth - 2 * topPad) : chartWidth / 2;
        const revY = topPad + (1 - m.revenue / maxRev) * (chartHeight - topPad);
        const profitY = topPad + (1 - m.profit / maxRev) * (chartHeight - topPad);
        return { month: m.month.replace(/^\d{4}-?/, ''), rev: m.revenue / 1e6, profit: m.profit / 1e6, x, revY, profitY };
      })
    : [
        { month: 'Jan', rev: 12.2, profit: 4.8, x: 20, revY: 130, profitY: 150 },
        { month: 'Feb', rev: 12.9, profit: 5.1, x: 80, revY: 120, profitY: 144 },
        { month: 'Mar', rev: 13.5, profit: 5.4, x: 140, revY: 110, profitY: 140 },
        { month: 'Apr', rev: 14.1, profit: 5.8, x: 200, revY: 95, profitY: 132 },
        { month: 'May', rev: 14.8, profit: 6.2, x: 260, revY: 80, profitY: 124 },
        { month: 'Jun', rev: 14.5, profit: 6.0, x: 320, revY: 88, profitY: 128 },
        { month: 'Jul', rev: 15.6, profit: 6.6, x: 380, revY: 68, profitY: 118 },
        { month: 'Aug', rev: 16.4, profit: 7.0, x: 440, revY: 55, profitY: 110 },
        { month: 'Sep', rev: 16.1, profit: 6.8, x: 500, revY: 60, profitY: 114 },
        { month: 'Oct', rev: 17.8, profit: 7.6, x: 560, revY: 40, profitY: 102 },
        { month: 'Nov', rev: 18.5, profit: 8.0, x: 620, revY: 30, profitY: 95 },
        { month: 'Dec', rev: 19.2, profit: 8.4, x: 660, revY: 24, profitY: 90 },
      ];

  const safeChartIdx = activeChartMonth >= 0 && activeChartMonth < monthlyData.length ? activeChartMonth : Math.max(monthlyData.length - 1, 0);
  const currentHoverPoint = monthlyData[safeChartIdx] ?? monthlyData[0];

  // ── Live products from backend, fallback to mock ────────────────────────
  const liveProducts: ProductSKU[] = liveData?.top_products
    ? liveData.top_products.map((p, idx) => ({
        id: `live-prod-${idx}`,
        name: p.product,
        category: '',
        unitsSold: p.units,
        netRevenue: p.revenue,
        netRevenueFormatted: p.revenue >= 1e6 ? `$${(p.revenue / 1e6).toFixed(1)}M` : `$${p.revenue.toLocaleString()}`,
        volumeWeight: Math.min(100, Math.round((p.revenue / Math.max(...(liveData?.top_products?.map(tp => tp.revenue) ?? [1]))) * 100)),
        marginStatus: 0,
        statusColor: ['bg-[#7C3AED]', 'bg-[#2563EB]', 'bg-[#6366F1]', 'bg-[#0F766E]', 'bg-[#0891B2]', 'bg-[#4F46E5]', 'bg-[#3B82F6]'][idx % 7],
        skuCode: `SKU-${idx + 1}`,
        region: '',
      }))
    : TOP_PRODUCTS;

  const filteredProducts = liveProducts.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.skuCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportCSV = () => {
    const headers = 'Product / Machine SKU,Category Group,Units Sold,Net Revenue,Margin Status\n';
    const rows = filteredProducts.map(p => 
      `"${p.name}","${p.category}",${p.unitsSold},"${p.netRevenueFormatted}","${p.marginStatus}%"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SAP_HANA_Products_Leaderboard_${selectedPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col w-full">
      {/* Top Editorial Header & Operational Controls */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg mb-space-xl">
        <div className="flex flex-col max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-space-xs">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-[#64748B] font-semibold">
              Enterprise Intelligence · Fiscal Year 2023 – 2025
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] font-label-sm text-label-sm font-medium">
              HANA Stream Sync: {syncTime}
            </span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-[#0F172A] tracking-tight font-semibold">
            Executive Sales & Analytics Dashboard
          </h1>
          <p className="font-body-md text-body-md text-[#475569] mt-1">
            Real-time enterprise metrics & machine-learning projections powered by SAP HANA Vector & AI Core.
          </p>
        </div>

        {/* Header Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap shrink-0 self-start lg:self-end mt-2 lg:mt-0">
          <button 
            onClick={handleSync}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full bg-white text-[#334155] font-label-md text-label-md hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors shadow-2xs border border-[#E2E8F0] whitespace-nowrap shrink-0" 
            type="button"
          >
            <span className={`material-symbols-outlined text-[16px] text-[#64748B] ${syncing ? 'animate-spin text-[#2563EB]' : ''}`}>
              sync
            </span>
            <span>{syncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          <button 
            onClick={() => onNavigate('upload-dataset')}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full bg-white text-[#334155] font-label-md text-label-md hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors shadow-2xs border border-[#E2E8F0] whitespace-nowrap shrink-0" 
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-[#64748B]">upload_file</span>
            <span>Upload Data</span>
          </button>

          <button 
            onClick={() => onNavigate('build-your-kpi-graph-studio')}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full bg-[#EFF6FF] text-[#1D4ED8] font-label-md text-label-md hover:bg-[#DBEAFE] transition-colors shadow-2xs border border-[#BFDBFE] whitespace-nowrap shrink-0 font-medium" 
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-[#2563EB]">query_stats</span>
            <span>Custom Graph</span>
          </button>

          <button 
            onClick={() => onNavigate('ai-dashboards-rag-chat')}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full bg-[#F5F3FF] text-[#6D28D9] font-label-md text-label-md hover:bg-[#EDE9FE] transition-colors shadow-2xs border border-[#DDD6FE] whitespace-nowrap shrink-0 font-medium" 
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-[#7C3AED]">chat</span>
            <span>RAG Chat</span>
          </button>
        </div>
      </section>

      {/* KPI Quadrant Cards Grid (4 Columns) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-lg sm:mb-space-xl">
        {/* Card 1: Total Net Revenue (Blue Accent) */}
        <div className="flex flex-col justify-between p-[22px] rounded-xl bg-white border border-[#E2E8F0] shadow-sm hover:border-[#CBD5E1] transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md uppercase tracking-wider text-[#64748B] font-medium">
                {kpis[0]?.title ?? 'Total Net Revenue'}
              </span>
              <span className="font-headline-lg text-headline-lg text-[#0F172A] font-semibold mt-1">
                {kpis[0]?.value ?? periodMultiplier.rev}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-space-md pt-space-xs">
            <div className={`flex items-center gap-1 ${kpis[0]?.trend === 'down' ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
              <span className="material-symbols-outlined text-[16px]">{kpis[0]?.trend === 'down' ? 'trending_down' : 'trending_up'}</span>
              <span className="font-label-sm text-label-sm font-semibold">
                {kpis[0]?.change ?? '+14.8%'} YoY
              </span>
            </div>
            {/* Sparkline SVG */}
            <svg className="w-20 h-6 text-[#2563EB]" fill="none" viewBox="0 0 80 24">
              <path 
                d="M1 20L14 16L27 18L40 11L53 14L66 7L79 3" 
                stroke="currentColor" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="1.75" 
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Quantity Sold (Teal Accent) */}
        <div className="flex flex-col justify-between p-[22px] rounded-xl bg-white border border-[#E2E8F0] shadow-sm hover:border-[#CBD5E1] transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md uppercase tracking-wider text-[#64748B] font-medium">
                {kpis[1]?.title ?? 'Total Quantity Sold'}
              </span>
              <span className="font-headline-lg text-headline-lg text-[#0F172A] font-semibold mt-1">
                {kpis[1]?.value ?? periodMultiplier.qty}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#CCFBF1] text-[#0F766E]">
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-space-md pt-space-xs">
            <div className="flex items-center gap-1 text-[#0F766E]">
              <span className="material-symbols-outlined text-[16px]">{kpis[1]?.trend === 'down' ? 'trending_down' : 'check'}</span>
              <span className="font-label-sm text-label-sm font-semibold">
                {kpis[1]?.change ?? '+8.2%'} vs Plan
              </span>
            </div>
            <svg className="w-20 h-6 text-[#0F766E]" fill="none" viewBox="0 0 80 24">
              <path 
                d="M1 18L15 17L28 14L41 16L54 9L68 12L79 4" 
                stroke="currentColor" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="1.75" 
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Gross Margin (Indigo Accent) */}
        <div className="flex flex-col justify-between p-[22px] rounded-xl bg-white border border-[#E2E8F0] shadow-sm hover:border-[#CBD5E1] transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md uppercase tracking-wider text-[#64748B] font-medium">
                {kpis[2]?.title ?? 'Gross Margin'}
              </span>
              <span className="font-headline-lg text-headline-lg text-[#0F172A] font-semibold mt-1">
                {kpis[2]?.value ?? periodMultiplier.margin}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
              <span className="material-symbols-outlined text-[20px]">pie_chart</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-space-md pt-space-xs">
            <div className="flex items-center gap-1 text-[#4F46E5]">
              <span className="material-symbols-outlined text-[16px]">{kpis[2]?.trend === 'down' ? 'trending_down' : 'arrow_outward'}</span>
              <span className="font-label-sm text-label-sm font-semibold">
                {kpis[2]?.change ?? '+2.4%'} pts expansion
              </span>
            </div>
            <svg className="w-20 h-6 text-[#4F46E5]" fill="none" viewBox="0 0 80 24">
              <path 
                d="M1 19L16 18L29 13L42 14L55 8L69 6L79 5" 
                stroke="currentColor" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="1.75" 
              />
            </svg>
          </div>
        </div>

        {/* Card 4: Active Countries (Cyan Accent) */}
        <div className="flex flex-col justify-between p-[22px] rounded-xl bg-white border border-[#E2E8F0] shadow-sm hover:border-[#CBD5E1] transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md uppercase tracking-wider text-[#64748B] font-medium">
                Active Countries
              </span>
              <span className="font-headline-lg text-headline-lg text-[#0F172A] font-semibold mt-1">
                {kpis[3]?.value ?? '15'} Markets
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#CFFAFE] text-[#0891B2]">
              <span className="material-symbols-outlined text-[20px]">public</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-space-md pt-space-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0891B2]"></span>
              <span className="font-label-sm text-label-sm text-[#475569]">
                Global Tier-1 Footprint
              </span>
            </div>
            <span className="font-label-sm text-label-sm font-semibold text-[#16A34A]">
              100% Operational
            </span>
          </div>
        </div>
      </section>

      {/* Row 1: Dual-Line Enterprise Revenue Timeline + Regional Market Share Bento (8 / 4 Grid) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-md mb-space-md">
        {/* Main Dual Line Analytics Panel (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between p-space-lg rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold">
                Monthly Net Revenue & Gross Profit
              </h2>
              <p className="font-body-sm text-body-sm text-[#475569]">
                Historical performance curves across discrete ledger cycles.
              </p>
            </div>
            {/* Segmented Filter Pills */}
            <div className="flex items-center p-1 rounded-full bg-[#F1F5F9] self-start border border-[#E2E8F0]">
              {(['All', '2025', '2024', '2023'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1 rounded-full font-label-sm text-label-sm transition-all ${
                    selectedPeriod === period
                      ? 'bg-white text-[#2563EB] shadow-xs font-semibold'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                  type="button"
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* Financial Metrics Summary Band */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-space-sm p-3 sm:p-space-md rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] mb-space-md sm:mb-space-lg">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-[#64748B] uppercase tracking-wider font-medium">
                Period Revenue
              </span>
              <span className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold mt-0.5">
                {periodMultiplier.rev}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-[#64748B] uppercase tracking-wider font-medium">
                Gross Profit
              </span>
              <span className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold mt-0.5">
                {periodMultiplier.profit}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-[#64748B] uppercase tracking-wider font-medium">
                Avg Profit Margin
              </span>
              <span className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold mt-0.5">
                {periodMultiplier.margin}
              </span>
            </div>
          </div>

          {/* High-Fidelity SVG Dual Chart Representation */}
          <div className="w-full overflow-x-auto pb-1">
            <div className="relative min-w-[540px] sm:min-w-0 w-full h-[260px] flex flex-col justify-end">
              <svg 
                className="w-full h-full overflow-visible" 
                preserveAspectRatio="none" 
                viewBox="0 0 680 200"
              >
              <defs>
                <linearGradient id="revenueGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.22"></stop>
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0"></stop>
                </linearGradient>
                <linearGradient id="marginGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.16"></stop>
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0"></stop>
                </linearGradient>
              </defs>

              {/* Horizontal Grid Guides */}
              <line stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="680" y1="20" y2="20" />
              <line stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="680" y1="70" y2="70" />
              <line stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="680" y1="120" y2="120" />
              <line stroke="#E2E8F0" strokeWidth="1" x1="0" x2="680" y1="170" y2="170" />

              {/* Area Fills */}
              <polygon fill="url(#revenueGrad)" points={monthlyData.map(m => `${m.x},${m.revY}`).join(' ') + ` ${monthlyData[monthlyData.length - 1]?.x ?? 660},170 ${monthlyData[0]?.x ?? 20},170`} />
              <polygon fill="url(#marginGrad)" points={monthlyData.map(m => `${m.x},${m.profitY}`).join(' ') + ` ${monthlyData[monthlyData.length - 1]?.x ?? 660},170 ${monthlyData[0]?.x ?? 20},170`} />

              {/* Net Revenue Curve (Solid Royal Blue #2563EB) */}
              <path 
                d={`M ${monthlyData.map(m => `${m.x} ${m.revY}`).join(' L ')}`}
                fill="none" 
                stroke="#2563EB" 
                strokeLinecap="round" 
                strokeWidth="2.5" 
              />

              {/* Gross Profit Curve (Indigo #6366F1) */}
              <path 
                d={`M ${monthlyData.map(m => `${m.x} ${m.profitY}`).join(' L ')}`}
                fill="none" 
                stroke="#6366F1" 
                strokeDasharray="3 3" 
                strokeLinecap="round" 
                strokeWidth="2" 
              />

              {/* Active Marker Pointer */}
              <line stroke="#CBD5E1" strokeWidth="1" x1={currentHoverPoint.x} x2={currentHoverPoint.x} y1="20" y2="170" />
              <circle cx={currentHoverPoint.x} cy={currentHoverPoint.revY} fill="#2563EB" r="4.5" stroke="#ffffff" strokeWidth="2" />
              <circle cx={currentHoverPoint.x} cy={currentHoverPoint.profitY} fill="#6366F1" r="3.5" stroke="#ffffff" strokeWidth="2" />
            </svg>

            {/* Tooltip Visual Callout */}
            <div 
              className="absolute top-2 p-2.5 rounded-xl bg-[#0F172A] text-white shadow-xl text-left transition-all duration-200 pointer-events-none border border-slate-700"
              style={{
                left: `${Math.min(Math.max(currentHoverPoint.x - 40, 20), 520)}px`
              }}
            >
              <span className="font-label-sm text-label-sm font-semibold uppercase text-slate-300">
                {currentHoverPoint.month} Realized
              </span>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="font-body-sm text-body-sm font-semibold text-[#60A5FA]">
                  Rev: ${currentHoverPoint.rev}M
                </span>
                <span className="font-body-sm text-body-sm font-semibold text-[#A5B4FC]">
                  Profit: ${currentHoverPoint.profit}M
                </span>
              </div>
            </div>

            {/* Timeline X-Ticks (Interactive click or hover to inspect month) */}
            <div className="flex justify-between items-center pt-2 text-[#64748B] font-label-sm text-label-sm select-none">
              {monthlyData.map((m, idx) => (
                <button
                  key={m.month}
                  onClick={() => setActiveChartMonth(idx)}
                  className={`hover:text-[#0F172A] transition-colors ${
                    activeChartMonth === idx ? 'font-semibold text-[#2563EB] scale-110' : ''
                  }`}
                >
                  {m.month}
                </button>
              ))}
            </div>
          </div>
        </div>

          {/* Chart Legend Footer */}
          <div className="flex flex-wrap items-center justify-between gap-space-md pt-space-md mt-space-sm border-t border-[#E2E8F0]">
            <div className="flex flex-wrap items-center gap-space-md">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-1 rounded-full bg-[#2563EB]"></span>
                <span className="font-label-sm text-label-sm text-[#0F172A] font-semibold">
                  Net Revenue (Realized)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-1 rounded-full bg-[#6366F1]"></span>
                <span className="font-label-sm text-label-sm text-[#475569] font-medium">
                  Gross Profit Allocation
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[#64748B]">
              <span className="material-symbols-outlined text-[14px]">tune</span>
              <span className="font-label-sm text-label-sm">Variance: ±1.2%</span>
            </div>
          </div>
        </div>

        {/* Regional Market Share Panel (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between p-space-lg rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <h2 className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold">
                Regional Market Share
              </h2>
              <span className="font-label-sm text-[10px] text-[#2563EB] font-mono px-2 py-0.5 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] font-semibold">
                GEO-4
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-[#475569] mb-space-lg">
              Global enterprise revenue contribution mapped across operating theaters.
            </p>

            {/* Ranked Regional Distribution Rows */}
            <div className="flex flex-col gap-space-md">
              {(liveData?.region_breakdown ?? REGIONAL_MARKET_SHARE.map(r => ({ region: r.name, revenue: parseFloat(r.revenue.replace(/[$M,]/g, '')) * 1e6, share: r.percentage }))).map((reg, idx) => {
                const regionColors = ['bg-[#2563EB]', 'bg-[#4F46E5]', 'bg-[#0F766E]', 'bg-[#0891B2]', 'bg-[#7C3AED]'];
                const regName = 'region' in reg ? reg.region : '';
                const regShare = 'share' in reg ? reg.share : 0;
                const regRevenue = 'revenue' in reg ? reg.revenue : 0;
                const revFormatted = regRevenue >= 1e6 ? `$${(regRevenue / 1e6).toFixed(1)}M` : `$${regRevenue.toLocaleString()}`;
                return (
                  <div key={regName} className="flex flex-col">
                    <div className="flex items-center justify-between font-label-md text-label-md mb-1.5">
                      <span className="font-medium text-[#0F172A]">#{idx + 1} {regName}</span>
                      <span className="text-[#0F172A] font-semibold">{revFormatted} · {regShare.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${regionColors[idx % regionColors.length]} transition-all duration-500`}
                        style={{ width: `${regShare}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Regional Insight Badge (GenAI Accent) */}
          <div className="p-space-md rounded-xl bg-[#F5F3FF] mt-space-lg border border-[#DDD6FE]">
            <div className="flex items-start gap-space-sm">
              <span className="material-symbols-outlined text-[#7C3AED] text-[18px]">verified</span>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm font-semibold text-[#6D28D9]">
                  HANA Geo-Clustering Insight
                </span>
                <p className="font-body-sm text-body-sm text-[#5B21B6] mt-0.5">
                  EMEA expansion accelerated by +18% following German DAX enterprise supply agreements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Row 2: Geographic Bar Chart + Category Breakdown + Targets vs Actual (3 Column Bento) */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md mb-space-md">
        {/* Top Revenue by Country */}
        <div className="flex flex-col justify-between p-space-lg rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-space-xs">
              <h2 className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold">
                Top Revenue by Country
              </h2>
              <span className="material-symbols-outlined text-[#64748B] text-[18px]">flag</span>
            </div>
            <p className="font-body-sm text-body-sm text-[#475569] mb-space-md">
              Leading sovereign market sales volumes.
            </p>

            {/* Horizontal Bar Rankings */}
            <div className="flex flex-col gap-3.5">
              {(liveData?.country_breakdown ?? TOP_REVENUE_COUNTRIES.map(c => ({ country: c.country, revenue: c.revenueNum * 1e6 }))).map((c, idx) => {
                const countryColors = ['bg-[#2563EB]', 'bg-[#4F46E5]', 'bg-[#0F766E]', 'bg-[#0891B2]', 'bg-[#059669]'];
                const maxCountryRev = Math.max(...(liveData?.country_breakdown ?? [{ revenue: 1 }]).map(cc => cc.revenue), 1);
                const pct = (c.revenue / maxCountryRev) * 100;
                const revFormatted = c.revenue >= 1e6 ? `$${(c.revenue / 1e6).toFixed(1)}M` : `$${c.revenue.toLocaleString()}`;
                return (
                  <div key={c.country} className="flex flex-col">
                    <div className="flex justify-between items-center font-label-md text-label-md mb-1">
                      <span className="text-[#0F172A] font-medium">{c.country}</span>
                      <span className="font-semibold text-[#0F172A]">{revFormatted}</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${countryColors[idx % countryColors.length]} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-space-md flex items-center justify-between text-[#64748B] font-label-sm text-label-sm border-t border-[#E2E8F0] mt-space-md">
            <span>Combined Top 5: $144.0M</span>
            <span className="font-semibold text-[#0F172A]">78.1% of Total</span>
          </div>
        </div>

        {/* Product Category Revenue */}
        <div className="flex flex-col justify-between p-space-lg rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-space-xs">
              <h2 className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold">
                Product Category Revenue
              </h2>
              <span className="material-symbols-outlined text-[#64748B] text-[18px]">category</span>
            </div>
            <p className="font-body-sm text-body-sm text-[#475569] mb-space-md">
              Allocation across high-margin business lines.
            </p>

            <div className="space-y-3">
              {(liveData?.category_breakdown ?? PRODUCT_CATEGORIES.map(c => ({ category: c.category, revenue: c.revenueNum * 1e6 }))).map((cat) => {
                const revFormatted = cat.revenue >= 1e6 ? `$${(cat.revenue / 1e6).toFixed(1)}M` : `$${cat.revenue.toLocaleString()}`;
                return (
                  <div key={cat.category} className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between hover:bg-[#F1F5F9] transition-colors">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-label-md text-label-md font-medium text-[#0F172A] truncate">
                        {cat.category}
                      </span>
                    </div>
                    <span className="font-body-md text-body-md font-semibold text-[#0F172A] whitespace-nowrap">
                      {revFormatted}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-space-md flex items-center justify-between font-label-sm text-label-sm text-[#64748B] border-t border-[#E2E8F0] mt-space-md">
            <span>5 Core Clusters</span>
            <span className="text-[#16A34A] font-semibold">↑ Robotics (+29%)</span>
          </div>
        </div>

        {/* Quarterly Targets vs Actual */}
        <div className="flex flex-col justify-between p-space-lg rounded-xl bg-white border border-[#E2E8F0] shadow-sm md:col-span-2 xl:col-span-1">
          <div>
            <div className="flex items-center justify-between mb-space-xs">
              <h2 className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold">
                Quarterly Targets vs Actual
              </h2>
              <span className="material-symbols-outlined text-[#64748B] text-[18px]">track_changes</span>
            </div>
            <p className="font-body-sm text-body-sm text-[#475569] mb-space-md">
              Budget plan attainment by fiscal quarter.
            </p>

            {/* Attainment Visual Grid */}
            <div className="flex flex-col gap-4">
              {(liveData?.quarterly_performance ?? QUARTERLY_TARGETS.map(q => ({ quarter: q.quarter, target: parseFloat(q.actualVsTarget.split('/')[1]?.replace(/[$ M,]/g, '')) * 1e6 || 0, actual: parseFloat(q.actualVsTarget.split('/')[0]?.replace(/[$ M,]/g, '')) * 1e6 || 0 }))).map((tgt) => {
                const attainmentPct = tgt.target > 0 ? (tgt.actual / tgt.target) * 100 : 0;
                const isForecast = attainmentPct < 100;
                const actualFmt = tgt.actual >= 1e6 ? `$${(tgt.actual / 1e6).toFixed(1)}M` : `$${tgt.actual.toLocaleString()}`;
                const targetFmt = tgt.target >= 1e6 ? `$${(tgt.target / 1e6).toFixed(1)}M` : `$${tgt.target.toLocaleString()}`;
                return (
                  <div key={tgt.quarter} className="flex flex-col">
                    <div className="flex items-center justify-between font-label-md text-label-md mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#0F172A]">{tgt.quarter}</span>
                        <span className={`font-label-sm text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isForecast
                            ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]' 
                            : 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]'
                        }`}>
                          {attainmentPct.toFixed(1)}%
                        </span>
                      </div>
                      <span className="text-[#475569] font-body-sm text-body-sm">
                        {actualFmt} / {targetFmt}
                      </span>
                    </div>
                    <div className="relative w-full h-2.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          isForecast ? 'bg-[#F59E0B]' : 'bg-[#16A34A]'
                        } transition-all duration-500`}
                        style={{ width: `${Math.min(attainmentPct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-space-md flex items-center justify-between font-label-sm text-label-sm text-[#64748B] border-t border-[#E2E8F0] mt-space-md">
            <span>Year-to-date attainment: 102.8%</span>
            <span className="text-[#16A34A] font-semibold">Exceeding Plan</span>
          </div>
        </div>
      </section>

      {/* Editorial Section: Top Performing Products Leaderboard (Data Table) */}
      <section className="flex flex-col p-space-lg rounded-xl bg-white border border-[#E2E8F0] shadow-sm mb-space-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md mb-space-md">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold">
              Top Performing Products Leaderboard
            </h2>
            <p className="font-body-sm text-body-sm text-[#475569]">
              Realized operational sales volume by individual enterprise stock keeping units (SKUs).
            </p>
          </div>

          {/* Search Input Filter */}
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#64748B] text-[16px]">
              search
            </span>
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-xl bg-[#F8FAFC] text-[#0F172A] placeholder:text-[#64748B] font-body-sm text-body-sm border border-[#E2E8F0] focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors" 
              placeholder="Filter product names..." 
              type="text"
            />
          </div>
        </div>

        {/* Mobile Swipe Hint */}
        <div className="flex md:hidden items-center gap-1.5 text-[#64748B] text-[11px] mb-2 px-1">
          <span className="material-symbols-outlined text-[14px]">swipe</span>
          <span>Swipe horizontally to inspect all SKU columns</span>
        </div>

        {/* Data Table Canvas */}
        <div className="w-full overflow-x-auto pb-1 scroll-touch">
          <table className="w-full min-w-[620px] text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] font-label-md text-label-md uppercase tracking-wider text-[#64748B] border-b border-[#E2E8F0]">
                <th className="py-2.5 px-4 rounded-l-lg font-medium">Product / Machine SKU</th>
                <th className="py-2.5 px-4 font-medium">Category Group</th>
                <th className="py-2.5 px-4 font-medium text-right">Units Sold</th>
                <th className="py-2.5 px-4 font-medium text-right">Net Revenue</th>
                <th className="py-2.5 px-4 font-medium">Volume Weight</th>
                <th className="py-2.5 px-4 rounded-r-lg font-medium text-right">Margin Status</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm text-[#0F172A] divide-y divide-[#F1F5F9]">
              {filteredProducts.map((prod) => {
                let marginBadgeClass = 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]';
                if (prod.marginStatus >= 45) {
                  marginBadgeClass = 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]';
                } else if (prod.marginStatus >= 40) {
                  marginBadgeClass = 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]';
                }

                return (
                  <tr key={prod.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3.5 px-4 font-medium">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${prod.statusColor} shadow-2xs shrink-0`}></span>
                        <span className="text-[#0F172A] font-semibold">{prod.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#475569]">{prod.category}</td>
                    <td className="py-3.5 px-4 text-right font-medium font-mono text-[#334155]">
                      {prod.unitsSold.toLocaleString()} units
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#0F172A] font-mono">
                      {prod.netRevenueFormatted}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-24 h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                        <div 
                          className={`h-full ${prod.statusColor} rounded-full transition-all duration-300`} 
                          style={{ width: `${prod.volumeWeight}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-[11px] font-mono font-semibold ${marginBadgeClass}`}>
                        {prod.marginStatus}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Pagination / Summary Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-space-md mt-space-sm gap-2 text-[#64748B] font-label-sm text-label-sm border-t border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"></span>
            <span>Showing {filteredProducts.length} of 184 active SAP Material Master records</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportCSV}
              className="text-[#2563EB] hover:text-[#1D4ED8] hover:underline font-semibold" 
              type="button"
            >
              Export CSV
            </button>
            <span>·</span>
            <button 
              onClick={() => setFullCatalogueOpen(true)}
              className="text-[#2563EB] hover:text-[#1D4ED8] hover:underline font-semibold" 
              type="button"
            >
              View Full Catalogue
            </button>
          </div>
        </div>
      </section>

      {/* Editorial Bottom Micro-Card Strip (SAP Intelligence Pipeline Telemetry) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-space-md mb-space-xl">
        <div className="p-space-md rounded-xl bg-white flex items-center justify-between shadow-sm border border-[#E2E8F0]">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[20px] text-[#2563EB]">database</span>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-[#0F172A] font-semibold">HANA In-Memory Core</span>
              <span className="font-label-sm text-label-sm text-[#64748B]">Query Latency: 12ms</span>
            </div>
          </div>
          <span className="font-label-sm text-[11px] px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] font-medium">
            Optimized
          </span>
        </div>

        <div className="p-space-md rounded-xl bg-white flex items-center justify-between shadow-sm border border-[#E2E8F0]">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[20px] text-[#7C3AED]">psychology</span>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-[#0F172A] font-semibold">AI Core Inference Engine</span>
              <span className="font-label-sm text-label-sm text-[#64748B]">Llama-3.2 90B Vectorized</span>
            </div>
          </div>
          <span className="font-label-sm text-[11px] px-2.5 py-0.5 rounded-full bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE] font-medium">
            Online
          </span>
        </div>

        <div className="p-space-md rounded-xl bg-white flex items-center justify-between shadow-sm border border-[#E2E8F0]">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[20px] text-[#059669]">security</span>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-[#0F172A] font-semibold">Enterprise Role Audit</span>
              <span className="font-label-sm text-label-sm text-[#64748B]">Tier-1 Access Controlled</span>
            </div>
          </div>
          <span className="font-label-sm text-[11px] px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] font-medium">
            Compliant
          </span>
        </div>
      </section>

      {/* Full Catalogue Modal */}
      {fullCatalogueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div 
            className="fixed inset-0" 
            onClick={() => setFullCatalogueOpen(false)} 
          />
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 max-h-[85vh] flex flex-col z-10 border border-[#CBD5E1]">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold">
                  SAP Material Master Active Catalog
                </h3>
                <p className="font-body-sm text-body-sm text-[#475569]">
                  All enterprise stock keeping units linked to HANA column store
                </p>
              </div>
              <button 
                onClick={() => setFullCatalogueOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 my-4 space-y-2">
              {TOP_PRODUCTS.map((prod) => (
                <div key={prod.id} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${prod.statusColor} shrink-0`}></span>
                    <div>
                      <div className="font-label-md text-[#0F172A] font-semibold">{prod.name}</div>
                      <div className="font-label-sm text-[#64748B]">{prod.skuCode} · {prod.category} · {prod.region}</div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-label-md font-semibold text-[#0F172A]">{prod.netRevenueFormatted}</div>
                    <div className="font-label-sm text-[#64748B]">{prod.marginStatus}% margin</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] flex justify-between items-center">
              <span className="font-label-sm text-[#64748B]">184 Total Records in Working Set</span>
              <button 
                onClick={() => setFullCatalogueOpen(false)}
                className="px-5 py-2 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-label-md text-label-md shadow-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
