import React, { useState, useEffect, useMemo, useRef } from 'react';
import { fetchDashboardData, DashboardData } from '../services/dashboardService';

export interface ProductSKU {
  id: string;
  name: string;
  category: string;
  revenue: number;
  margin: number;
  growth: number;
  status: string;
}

interface ExecutiveDashboardProps {
  onNavigate: (path: string) => void;
}

// Helper to calculate available dropdown limits in steps of 5 up to total count
const getAvailableLimits = (totalCount: number): number[] => {
  const limits: number[] = [];
  for (let n = 5; n <= totalCount; n += 5) {
    limits.push(n);
  }
  return limits.length > 0 ? limits : [Math.min(5, totalCount)];
};

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncTime, setSyncTime] = useState('Loading...');
  const [hoveredRevenueMonthIdx, setHoveredRevenueMonthIdx] = useState<number | null>(null);
  const [fullCatalogueOpen, setFullCatalogueOpen] = useState(false);

  // ── Requirement 1: Dynamic Year Filter for Monthly Revenue & Profit Chart ──
  const [selectedRevenueYear, setSelectedRevenueYear] = useState<string>('All');

  // ── Requirement 2: Dynamic Limits for Country & Category Breakdown ──────────
  const [countryLimit, setCountryLimit] = useState<number>(5);
  const [categoryLimit, setCategoryLimit] = useState<number>(5);

  // ── Requirement 3: Vertical Quarterly Chart State & Dynamic Cursor Tooltip ─
  const [selectedQuarterYear, setSelectedQuarterYear] = useState<string>('All');
  const quarterChartContainerRef = useRef<HTMLDivElement>(null);
  const [quarterTooltip, setQuarterTooltip] = useState<{
    idx: number;
    x: number;
    y: number;
    barType?: 'actual' | 'target' | null;
  } | null>(null);

  // ── Requirement 4: Top Performing Products Leaderboard Pagination ─────────
  const [leaderboardPage, setLeaderboardPage] = useState<number>(0);
  const PAGE_SIZE = 10;

  // ── Live Backend Data ──────────────────────────────────────────────────────
  const [liveData, setLiveData] = useState<DashboardData | null>(null);
  const [, setDataLoading] = useState(true);

  const loadDashboardData = async () => {
    setSyncing(true);
    try {
      const data = await fetchDashboardData();
      setLiveData(data);
      setSyncTime('Just now');
    } catch {
      setSyncTime('Cached data');
    } finally {
      setSyncing(false);
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleSync = () => loadDashboardData();

  // Reset leaderboard pagination when search query changes
  useEffect(() => {
    setLeaderboardPage(0);
  }, [searchQuery]);

  // ── Dynamic Years for Revenue Trend (populated dynamically from dataset) ────
  const availableRevenueYears = useMemo(() => {
    const yearsSet = new Set<string>();
    (liveData?.revenue_trend ?? []).forEach(m => {
      const match = m.month.match(/^(\d{4})/);
      if (match) yearsSet.add(match[1]);
    });
    if (yearsSet.size === 0) {
      yearsSet.add('2024');
    }
    return Array.from(yearsSet).sort();
  }, [liveData]);

  // Filtered Revenue Trend Data based on Selected Year (or All)
  const filteredTrend = useMemo(() => {
    const allTrend = liveData?.revenue_trend ?? [];
    if (selectedRevenueYear === 'All') {
      return allTrend;
    }
    return allTrend.filter(m => m.month.startsWith(selectedRevenueYear));
  }, [liveData, selectedRevenueYear]);

  // Financial Metrics Summary Band dynamically computed for selected year/period
  const periodMetrics = useMemo(() => {
    const revSum = filteredTrend.reduce((s, m) => s + m.revenue, 0);
    const profitSum = filteredTrend.reduce((s, m) => s + m.profit, 0);
    const marginPct = revSum > 0 ? (profitSum / revSum) * 100 : 0;
    return {
      rev: revSum >= 1e6 ? `$${(revSum / 1e6).toFixed(1)}M` : `$${revSum.toLocaleString()}`,
      profit: profitSum >= 1e6 ? `$${(profitSum / 1e6).toFixed(1)}M` : `$${profitSum.toLocaleString()}`,
      margin: `${marginPct.toFixed(1)}%`,
      count: filteredTrend.length,
    };
  }, [filteredTrend]);

  // Revenue trend SVG coordinates
  const maxRev = Math.max(...filteredTrend.map(m => m.revenue), 1);
  const chartWidth = 680;
  const chartHeight = 170;
  const topPad = 20;

  const monthlyData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (filteredTrend.length === 0) return [];
    return filteredTrend.map((m, i) => {
      const x = filteredTrend.length > 1
        ? topPad + (i / (filteredTrend.length - 1)) * (chartWidth - 2 * topPad)
        : chartWidth / 2;
      const revY = topPad + (1 - m.revenue / maxRev) * (chartHeight - topPad);
      const profitY = topPad + (1 - m.profit / maxRev) * (chartHeight - topPad);

      const [yr, mo] = m.month.split('-');
      const moIdx = parseInt(mo, 10) - 1;
      const shortMo = !isNaN(moIdx) && moIdx >= 0 && moIdx < 12 ? monthNames[moIdx] : m.month;
      const fullMo = !isNaN(moIdx) && moIdx >= 0 && moIdx < 12 ? fullMonthNames[moIdx] : shortMo;
      const displayLabel = selectedRevenueYear === 'All' ? `${shortMo} '${yr?.slice(2) || ''}` : shortMo;
      const fullLabel = yr ? `${shortMo} ${yr}` : m.month;
      const monthYear = yr ? `${fullMo} ${yr}` : m.month;

      return {
        rawMonth: m.month,
        month: displayLabel,
        shortMo,
        fullMo,
        fullLabel,
        monthYear,
        year: yr,
        rev: Number((m.revenue / 1e6).toFixed(1)),
        profit: Number((m.profit / 1e6).toFixed(1)),
        revExact: m.revenue,
        profitExact: m.profit,
        x,
        revY,
        profitY,
      };
    });
  }, [filteredTrend, maxRev, selectedRevenueYear]);

  // Only populated when the user explicitly hovers over a data point/column
  const hoveredPoint = hoveredRevenueMonthIdx !== null && hoveredRevenueMonthIdx >= 0 && hoveredRevenueMonthIdx < monthlyData.length
    ? monthlyData[hoveredRevenueMonthIdx]
    : null;

  // ── Derived KPI Quadrant Cards Data ───────────────────────────────────────
  const kpis = liveData?.kpis ?? [
    { title: 'Total Net Revenue', value: '$184.2M', change: '+14.8%', trend: 'up' as const },
    { title: 'Total Quantity Sold', value: '1,420,890', change: '+8.2%', trend: 'up' as const },
    { title: 'Gross Margin', value: '42.6%', change: '+2.4%', trend: 'up' as const },
    { title: 'Active Countries', value: '18', change: '0.0%', trend: 'neutral' as const },
  ];

  // ── Requirement 2: Top Revenue by Country (Sorted Descending, Dynamic Limits)
  const sortedCountries = useMemo(() => {
    const raw = liveData?.country_breakdown ?? [];
    return [...raw].sort((a, b) => b.revenue - a.revenue);
  }, [liveData]);

  const availableCountryLimits = useMemo(() => getAvailableLimits(sortedCountries.length), [sortedCountries]);
  const currentCountryLimit = availableCountryLimits.includes(countryLimit) ? countryLimit : (availableCountryLimits[0] ?? 5);
  const displayedCountries = useMemo(() => sortedCountries.slice(0, currentCountryLimit), [sortedCountries, currentCountryLimit]);
  const maxCountryRev = Math.max(...sortedCountries.map(c => c.revenue), 1);
  const displayedCountryTotal = displayedCountries.reduce((s, c) => s + c.revenue, 0);
  const totalCountryTotal = sortedCountries.reduce((s, c) => s + c.revenue, 0);
  const countrySharePct = totalCountryTotal > 0 ? (displayedCountryTotal / totalCountryTotal) * 100 : 0;

  // ── Requirement 2: Product Category Revenue (Sorted Descending, Dynamic Limits)
  const sortedCategories = useMemo(() => {
    const raw = liveData?.category_breakdown ?? [];
    return [...raw].sort((a, b) => b.revenue - a.revenue);
  }, [liveData]);

  const availableCategoryLimits = useMemo(() => getAvailableLimits(sortedCategories.length), [sortedCategories]);
  const currentCategoryLimit = availableCategoryLimits.includes(categoryLimit) ? categoryLimit : (availableCategoryLimits[0] ?? 5);
  const displayedCategories = useMemo(() => sortedCategories.slice(0, currentCategoryLimit), [sortedCategories, currentCategoryLimit]);
  const displayedCategoryTotal = displayedCategories.reduce((s, c) => s + c.revenue, 0);

  // ── Requirement 3: Vertical Quarterly Targets vs Actual ───────────────────
  const availableQuarterYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const list = liveData?.quarterly_performance ?? [];
    list.forEach(q => {
      const match = q.quarter.match(/\b(20\d{2})\b/);
      if (match) yearsSet.add(match[1]);
    });
    if (yearsSet.size === 0) yearsSet.add('2024');
    return Array.from(yearsSet).sort();
  }, [liveData]);

  const filteredQuarters = useMemo(() => {
    const list = liveData?.quarterly_performance ?? [];
    if (selectedQuarterYear === 'All') return list;
    return list.filter(q => q.quarter.includes(selectedQuarterYear));
  }, [liveData, selectedQuarterYear]);

  const parsedQuarters = useMemo(() => {
    return filteredQuarters.map((q, idx) => {
      const yrMatch = q.quarter.match(/\b(20\d{2})\b/);
      const qMatch = q.quarter.match(/\b(Q[1-4])\b/i);
      const year = yrMatch ? yrMatch[1] : '';
      const qCode = qMatch ? qMatch[1].toUpperCase() : `Q${idx + 1}`;
      const isForecast = q.quarter.toLowerCase().includes('forecast') || q.quarter.toLowerCase().includes('progress');
      const attainmentPct = q.target > 0 ? (q.actual / q.target) * 100 : 0;
      const label = selectedQuarterYear === 'All' && year ? `${qCode} '${year.slice(2)}` : qCode;

      return {
        ...q,
        year,
        qCode,
        label,
        isForecast,
        attainmentPct,
      };
    });
  }, [filteredQuarters, selectedQuarterYear]);

  const maxQuarterVal = Math.max(...parsedQuarters.map(q => Math.max(q.actual, q.target)), 1) * 1.12;
  const totalQuarterActual = parsedQuarters.reduce((s, q) => s + q.actual, 0);
  const totalQuarterTarget = parsedQuarters.reduce((s, q) => s + q.target, 0);
  const totalQuarterAttainment = totalQuarterTarget > 0 ? (totalQuarterActual / totalQuarterTarget) * 100 : 0;

  // ── Requirement 4: Top Performing Products Leaderboard ────────────────────
  const liveProducts: any[] = useMemo(() => {
    const rawList = (liveData?.top_products ?? []).map((p, idx) => ({
      id: `live-prod-${idx}`,
      name: p.product,
      category: 'Industrial Fleet',
      unitsSold: p.units,
      netRevenue: p.revenue,
      netRevenueFormatted: p.revenue >= 1e6 ? `$${(p.revenue / 1e6).toFixed(1)}M` : `$${p.revenue.toLocaleString()}`,
      volumeWeight: Math.min(100, Math.round((p.revenue / Math.max(...((liveData?.top_products ?? []).map(tp => tp.revenue) ?? [1]))) * 100)),
      marginStatus: 42.0,
      statusColor: ['bg-[#7C3AED]', 'bg-[#2563EB]', 'bg-[#6366F1]', 'bg-[#0F766E]', 'bg-[#0891B2]', 'bg-[#4F46E5]', 'bg-[#3B82F6]'][idx % 7],
      skuCode: `SKU-${idx + 1}`,
      region: 'Global',
    }));

    return [...rawList].sort((a, b) => b.netRevenue - a.netRevenue);
  }, [liveData]);

  const filteredProducts = useMemo(() => {
    return liveProducts.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.skuCode.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [liveProducts, searchQuery]);

  const totalProductsCount = filteredProducts.length;
  const startIndex = leaderboardPage * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalProductsCount);
  const displayedLeaderboardProducts = useMemo(() => {
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, startIndex, endIndex]);

  const remainingProducts = Math.max(0, totalProductsCount - endIndex);
  const showNextButton = totalProductsCount > PAGE_SIZE && remainingProducts > 0;
  const showPrevButton = leaderboardPage > 0;

  const exportCSV = () => {
    const headers = 'Rank,Product / Machine SKU,Category Group,Units Sold,Net Revenue,Margin Status\n';
    const rows = filteredProducts.map((p, idx) =>
      `"${idx + 1}","${p.name}","${p.category}",${p.unitsSold},"${p.netRevenueFormatted}","${p.marginStatus}%"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SAP_HANA_Products_Leaderboard_FY${selectedRevenueYear}.csv`;
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
              Enterprise Intelligence · Fiscal Years {availableRevenueYears.join(' – ')}
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
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full bg-white text-[#334155] font-label-md text-label-md hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors shadow-2xs border border-[#E2E8F0] whitespace-nowrap shrink-0 cursor-pointer"
            type="button"
          >
            <span className={`material-symbols-outlined text-[16px] text-[#64748B] ${syncing ? 'animate-spin text-[#2563EB]' : ''}`}>
              sync
            </span>
            <span>{syncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          <button
            onClick={() => onNavigate('upload-dataset')}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full bg-white text-[#334155] font-label-md text-label-md hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors shadow-2xs border border-[#E2E8F0] whitespace-nowrap shrink-0 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-[#64748B]">upload_file</span>
            <span>Upload Data</span>
          </button>

          <button
            onClick={() => onNavigate('build-your-kpi-graph-studio')}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full bg-[#EFF6FF] text-[#1D4ED8] font-label-md text-label-md hover:bg-[#DBEAFE] transition-colors shadow-2xs border border-[#BFDBFE] whitespace-nowrap shrink-0 font-medium cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-[#2563EB]">query_stats</span>
            <span>Custom Graph</span>
          </button>

          <button
            onClick={() => onNavigate('ai-dashboards-rag-chat')}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full bg-[#F5F3FF] text-[#6D28D9] font-label-md text-label-md hover:bg-[#EDE9FE] transition-colors shadow-2xs border border-[#DDD6FE] whitespace-nowrap shrink-0 font-medium cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-[#7C3AED]">chat</span>
            <span>RAG Chat</span>
          </button>
        </div>
      </section>

      {/* KPI Quadrant Cards Grid (4 Columns) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-lg sm:mb-space-xl">
        {/* Card 1: Total Net Revenue */}
        <div className="flex flex-col justify-between p-[22px] rounded-xl bg-white border border-[#E2E8F0] shadow-sm hover:border-[#CBD5E1] transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md uppercase tracking-wider text-[#64748B] font-medium">
                {kpis[0]?.title ?? 'Total Net Revenue'}
              </span>
              <span className="font-headline-lg text-headline-lg text-[#0F172A] font-semibold mt-1">
                {kpis[0]?.value ?? periodMetrics.rev}
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
            <svg className="w-20 h-6 text-[#2563EB]" fill="none" viewBox="0 0 80 24">
              <path d="M1 20L14 16L27 18L40 11L53 14L66 7L79 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
            </svg>
          </div>
        </div>

        {/* Card 2: Quantity Sold */}
        <div className="flex flex-col justify-between p-[22px] rounded-xl bg-white border border-[#E2E8F0] shadow-sm hover:border-[#CBD5E1] transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md uppercase tracking-wider text-[#64748B] font-medium">
                {kpis[1]?.title ?? 'Total Quantity Sold'}
              </span>
              <span className="font-headline-lg text-headline-lg text-[#0F172A] font-semibold mt-1">
                {kpis[1]?.value ?? '1,420,890'}
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
              <path d="M1 18L15 17L28 14L41 16L54 9L68 12L79 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
            </svg>
          </div>
        </div>

        {/* Card 3: Gross Margin */}
        <div className="flex flex-col justify-between p-[22px] rounded-xl bg-white border border-[#E2E8F0] shadow-sm hover:border-[#CBD5E1] transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md uppercase tracking-wider text-[#64748B] font-medium">
                {kpis[2]?.title ?? 'Gross Margin'}
              </span>
              <span className="font-headline-lg text-headline-lg text-[#0F172A] font-semibold mt-1">
                {kpis[2]?.value ?? periodMetrics.margin}
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
              <path d="M1 19L16 18L29 13L42 14L55 8L69 6L79 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
            </svg>
          </div>
        </div>

        {/* Card 4: Active Countries */}
        <div className="flex flex-col justify-between p-[22px] rounded-xl bg-white border border-[#E2E8F0] shadow-sm hover:border-[#CBD5E1] transition-all">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md uppercase tracking-wider text-[#64748B] font-medium">
                Active Countries
              </span>
              <span className="font-headline-lg text-headline-lg text-[#0F172A] font-semibold mt-1">
                {sortedCountries.length} Markets
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
                Global Sovereign Footprint
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
        {/* ── Requirement 1: Main Dual Line Analytics Panel (8 cols) ── */}
        <div className="lg:col-span-8 flex flex-col justify-between p-space-lg rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold">
                Monthly Net Revenue & Gross Profit
              </h2>
              <p className="font-body-sm text-body-sm text-[#475569]">
                {selectedRevenueYear === 'All'
                  ? `Continuous performance curve across all ${availableRevenueYears.length} available fiscal years (${availableRevenueYears.join(', ')}).`
                  : `Monthly ledger performance for fiscal year ${selectedRevenueYear} (12 months).`}
              </p>
            </div>

            {/* Dynamic Year Dropdown / Filter (populated dynamically from dataset) */}
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <label htmlFor="revenue-year-select" className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Year:
              </label>
              <div className="relative">
                <select
                  id="revenue-year-select"
                  value={selectedRevenueYear}
                  onChange={(e) => {
                    setSelectedRevenueYear(e.target.value);
                    setHoveredRevenueMonthIdx(null);
                  }}
                  className="h-8.5 pl-3.5 pr-8 rounded-full bg-[#F8FAFC] text-[#0F172A] font-label-sm text-xs font-semibold border border-[#CBD5E1] shadow-2xs hover:border-[#2563EB] hover:bg-white focus:outline-none focus:border-[#2563EB] appearance-none cursor-pointer transition-colors"
                >
                  <option value="All">All Years</option>
                  {availableRevenueYears.map((yr) => (
                    <option key={yr} value={yr}>
                      FY {yr}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined text-[16px] text-[#64748B] absolute right-2.5 top-2 pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          {/* Financial Metrics Summary Band dynamically computed */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-space-sm p-3 sm:p-space-md rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] mb-space-md sm:mb-space-lg">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-[#64748B] uppercase tracking-wider font-medium">
                {selectedRevenueYear === 'All' ? 'All Years Revenue' : `${selectedRevenueYear} Revenue`}
              </span>
              <span className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold mt-0.5">
                {periodMetrics.rev}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-[#64748B] uppercase tracking-wider font-medium">
                {selectedRevenueYear === 'All' ? 'All Years Profit' : `${selectedRevenueYear} Gross Profit`}
              </span>
              <span className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold mt-0.5">
                {periodMetrics.profit}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-[#64748B] uppercase tracking-wider font-medium">
                Realized Margin
              </span>
              <span className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold mt-0.5">
                {periodMetrics.margin}
              </span>
            </div>
          </div>

          {/* High-Fidelity SVG Dual Chart Representation */}
          <div className="w-full overflow-x-auto pb-1">
            <div
              className="relative min-w-[540px] sm:min-w-0 w-full flex flex-col justify-end"
              onMouseLeave={() => setHoveredRevenueMonthIdx(null)}
            >
              <div
                className="relative w-full h-[220px]"
                onMouseLeave={() => setHoveredRevenueMonthIdx(null)}
              >
                <svg
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                  viewBox="0 0 680 200"
                  onMouseLeave={() => setHoveredRevenueMonthIdx(null)}
                >
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="marginGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity="0.16" />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Guides */}
                  <line stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="680" y1="20" y2="20" />
                  <line stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="680" y1="70" y2="70" />
                  <line stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="680" y1="120" y2="120" />
                  <line stroke="#E2E8F0" strokeWidth="1" x1="0" x2="680" y1="170" y2="170" />

                  {/* Area Fills */}
                  {monthlyData.length > 0 && (
                    <>
                      <polygon fill="url(#revenueGrad)" points={monthlyData.map(m => `${m.x},${m.revY}`).join(' ') + ` ${monthlyData[monthlyData.length - 1]?.x ?? 660},170 ${monthlyData[0]?.x ?? 20},170`} />
                      <polygon fill="url(#marginGrad)" points={monthlyData.map(m => `${m.x},${m.profitY}`).join(' ') + ` ${monthlyData[monthlyData.length - 1]?.x ?? 660},170 ${monthlyData[0]?.x ?? 20},170`} />
                    </>
                  )}

                  {/* Net Revenue Curve (Solid Royal Blue #2563EB) */}
                  {monthlyData.length > 0 && (
                    <path
                      d={`M ${monthlyData.map(m => `${m.x} ${m.revY}`).join(' L ')}`}
                      fill="none"
                      stroke="#2563EB"
                      strokeLinecap="round"
                      strokeWidth="2.5"
                    />
                  )}

                  {/* Gross Profit Curve (Indigo #6366F1) */}
                  {monthlyData.length > 0 && (
                    <path
                      d={`M ${monthlyData.map(m => `${m.x} ${m.profitY}`).join(' L ')}`}
                      fill="none"
                      stroke="#6366F1"
                      strokeDasharray="3 3"
                      strokeLinecap="round"
                      strokeWidth="2"
                    />
                  )}

                  {/* Interactive Hit Targets & Data Point Circles */}
                  {monthlyData.map((m, idx) => {
                    const colWidth = monthlyData.length > 1
                      ? (680 - 40) / (monthlyData.length - 1)
                      : 680;
                    const colX = monthlyData.length > 1
                      ? Math.max(0, m.x - colWidth / 2)
                      : 0;

                    return (
                      <g key={`hit-${m.rawMonth}-${idx}`}>
                        {/* Column slice for seamless hovering across the month */}
                        <rect
                          x={colX}
                          y={15}
                          width={colWidth}
                          height={170}
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredRevenueMonthIdx(idx)}
                          onMouseMove={() => setHoveredRevenueMonthIdx(idx)}
                        />
                        {/* Net Revenue point circle hit area */}
                        <circle
                          cx={m.x}
                          cy={m.revY}
                          r={14}
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredRevenueMonthIdx(idx)}
                          onMouseMove={() => setHoveredRevenueMonthIdx(idx)}
                        />
                        {/* Gross Profit point circle hit area */}
                        <circle
                          cx={m.x}
                          cy={m.profitY}
                          r={14}
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredRevenueMonthIdx(idx)}
                          onMouseMove={() => setHoveredRevenueMonthIdx(idx)}
                        />
                      </g>
                    );
                  })}

                  {/* Active Hover Marker Pointer (only shown when a specific point is hovered) */}
                  {hoveredPoint && (
                    <g className="pointer-events-none transition-opacity duration-150">
                      <line
                        stroke="#CBD5E1"
                        strokeDasharray="3 3"
                        strokeWidth="1.5"
                        x1={hoveredPoint.x}
                        x2={hoveredPoint.x}
                        y1="20"
                        y2="170"
                      />
                      {/* Revenue point active marker */}
                      <circle
                        cx={hoveredPoint.x}
                        cy={hoveredPoint.revY}
                        fill="#2563EB"
                        fillOpacity="0.2"
                        r="9"
                      />
                      <circle
                        cx={hoveredPoint.x}
                        cy={hoveredPoint.revY}
                        fill="#2563EB"
                        r="5"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      {/* Profit point active marker */}
                      <circle
                        cx={hoveredPoint.x}
                        cy={hoveredPoint.profitY}
                        fill="#6366F1"
                        fillOpacity="0.2"
                        r="8"
                      />
                      <circle
                        cx={hoveredPoint.x}
                        cy={hoveredPoint.profitY}
                        fill="#6366F1"
                        r="4"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    </g>
                  )}
                </svg>

                {/* Floating Detailed Tooltip: Only rendered when user hovers their cursor over a specific data point */}
                {hoveredPoint && (
                  <div
                    className="absolute pointer-events-none z-20 transition-all duration-100 ease-out"
                    style={{
                      left: `${(hoveredPoint.x / 680) * 100}%`,
                      top: `${(Math.min(hoveredPoint.revY, hoveredPoint.profitY) / 200) * 100}%`,
                      transform: `translate(${hoveredPoint.x > 500 ? '-100%' : hoveredPoint.x < 180 ? '0%' : '-50%'
                        }, ${Math.min(hoveredPoint.revY, hoveredPoint.profitY) < 75 ? '16px' : 'calc(-100% - 12px)'
                        })`,
                    }}
                  >
                    <div className="p-3 rounded-xl bg-[#0F172A] text-white shadow-2xl border border-slate-700/80 min-w-[200px] text-left">
                      <div className="flex items-center justify-between gap-2 pb-1.5 mb-2 border-b border-slate-800">
                        <span className="font-semibold text-xs text-slate-100">
                          {hoveredPoint.monthYear}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                          FY {hoveredPoint.year}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] shrink-0" />
                            <span>Net Revenue</span>
                          </div>
                          <span className="font-semibold text-[#60A5FA] font-mono">
                            ${hoveredPoint.rev}M
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1] shrink-0" />
                            <span>Gross Profit</span>
                          </div>
                          <span className="font-semibold text-[#A5B4FC] font-mono">
                            ${hoveredPoint.profit}M
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline X-Ticks: hoverable & responsive */}
              <div
                className="flex justify-between items-center pt-2 text-[#64748B] font-label-sm text-label-sm select-none overflow-x-auto"
                onMouseLeave={() => setHoveredRevenueMonthIdx(null)}
              >
                {monthlyData.map((m, idx) => {
                  const isAll = selectedRevenueYear === 'All';
                  const showLabel = !isAll || monthlyData.length <= 12 || idx % 3 === 0 || idx === monthlyData.length - 1;

                  return (
                    <button
                      key={`${m.rawMonth}-${idx}`}
                      onMouseEnter={() => setHoveredRevenueMonthIdx(idx)}
                      onMouseLeave={() => setHoveredRevenueMonthIdx(null)}
                      onClick={() => setHoveredRevenueMonthIdx(idx)}
                      className={`hover:text-[#0F172A] transition-colors whitespace-nowrap px-0.5 cursor-pointer ${hoveredRevenueMonthIdx === idx ? 'font-semibold text-[#2563EB] scale-105' : ''
                        }`}
                      title={`${m.monthYear} Realized`}
                      type="button"
                    >
                      {showLabel ? m.month : '·'}
                    </button>
                  );
                })}
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
              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
              <span className="font-label-sm text-label-sm font-medium">
                Scope: {selectedRevenueYear === 'All' ? `All Years (${availableRevenueYears.join(', ')})` : `FY ${selectedRevenueYear} (12 Months)`}
              </span>
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
              {(liveData?.region_breakdown ?? []).map((reg, idx) => {
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
        {/* ── Requirement 2: Top Revenue by Country (Dynamic Limit Dropdown 5, 10, 15...) ── */}
        <div className="flex flex-col justify-between p-space-lg rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-space-xs gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold truncate">
                  Top Revenue by Country
                </h2>
                <span className="material-symbols-outlined text-[#64748B] text-[18px] shrink-0">flag</span>
              </div>

              {/* Dynamic Limit Dropdown: only shows 5, 10, 15... if that many records actually exist */}
              <div className="flex items-center gap-1.5 shrink-0">
                <label htmlFor="country-limit-select" className="text-xs font-semibold text-[#64748B]">
                  Show:
                </label>
                <div className="relative">
                  <select
                    id="country-limit-select"
                    value={currentCountryLimit}
                    onChange={(e) => setCountryLimit(Number(e.target.value))}
                    className="h-7.5 pl-2.5 pr-7 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] font-label-sm text-xs font-semibold hover:border-[#2563EB] focus:outline-none cursor-pointer appearance-none shadow-2xs"
                  >
                    {availableCountryLimits.map(num => (
                      <option key={num} value={num}>
                        Top {num}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined text-[15px] text-[#64748B] absolute right-1.5 top-1.5 pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>
            </div>
            <p className="font-body-sm text-body-sm text-[#475569] mb-space-md">
              Leading sovereign market sales volumes sorted highest to lowest.
            </p>

            {/* Horizontal Bar Rankings: responsive and scrollable if limit is large */}
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1 scroll-touch">
              {displayedCountries.map((c, idx) => {
                const countryColors = ['bg-[#2563EB]', 'bg-[#4F46E5]', 'bg-[#0F766E]', 'bg-[#0891B2]', 'bg-[#059669]'];
                const pct = (c.revenue / maxCountryRev) * 100;
                const revFormatted = c.revenue >= 1e6 ? `$${(c.revenue / 1e6).toFixed(1)}M` : `$${c.revenue.toLocaleString()}`;
                return (
                  <div key={c.country} className="flex flex-col">
                    <div className="flex justify-between items-center font-label-md text-label-md mb-1">
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        <span className="font-mono text-xs font-semibold text-[#64748B] w-5 shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="text-[#0F172A] font-medium truncate">{c.country}</span>
                      </div>
                      <span className="font-semibold text-[#0F172A] font-mono shrink-0">{revFormatted}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${countryColors[idx % countryColors.length]} transition-all duration-500`}
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-space-md flex items-center justify-between text-[#64748B] font-label-sm text-label-sm border-t border-[#E2E8F0] mt-space-md">
            <span>
              Combined Top {currentCountryLimit}: ${displayedCountryTotal >= 1e6 ? (displayedCountryTotal / 1e6).toFixed(1) : displayedCountryTotal}M
            </span>
            <span className="font-semibold text-[#0F172A]">
              {countrySharePct.toFixed(1)}% of Global
            </span>
          </div>
        </div>

        {/* ── Requirement 2: Product Category Revenue (Dynamic Limit Dropdown 5, 10, 15...) ── */}
        <div className="flex flex-col justify-between p-space-lg rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-space-xs gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold truncate">
                  Product Category Revenue
                </h2>
                <span className="material-symbols-outlined text-[#64748B] text-[18px] shrink-0">category</span>
              </div>

              {/* Dynamic Limit Dropdown: only shows options that exist */}
              <div className="flex items-center gap-1.5 shrink-0">
                <label htmlFor="category-limit-select" className="text-xs font-semibold text-[#64748B]">
                  Show:
                </label>
                <div className="relative">
                  <select
                    id="category-limit-select"
                    value={currentCategoryLimit}
                    onChange={(e) => setCategoryLimit(Number(e.target.value))}
                    className="h-7.5 pl-2.5 pr-7 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] font-label-sm text-xs font-semibold hover:border-[#2563EB] focus:outline-none cursor-pointer appearance-none shadow-2xs"
                  >
                    {availableCategoryLimits.map(num => (
                      <option key={num} value={num}>
                        Top {num}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined text-[15px] text-[#64748B] absolute right-1.5 top-1.5 pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>
            </div>
            <p className="font-body-sm text-body-sm text-[#475569] mb-space-md">
              Allocation across core industrial business lines.
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scroll-touch">
              {displayedCategories.map((cat, idx) => {
                const revFormatted = cat.revenue >= 1e6 ? `$${(cat.revenue / 1e6).toFixed(1)}M` : `$${cat.revenue.toLocaleString()}`;
                return (
                  <div key={cat.category} className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between hover:bg-[#F1F5F9] transition-colors">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="font-mono text-xs font-semibold text-[#64748B] w-5 shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="font-label-md text-label-md font-medium text-[#0F172A] truncate">
                        {cat.category}
                      </span>
                    </div>
                    <span className="font-body-md text-body-md font-semibold text-[#0F172A] whitespace-nowrap font-mono">
                      {revFormatted}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-space-md flex items-center justify-between font-label-sm text-label-sm text-[#64748B] border-t border-[#E2E8F0] mt-space-md">
            <span>Top {currentCategoryLimit} of {sortedCategories.length} Categories</span>
            <span className="font-semibold text-[#0F172A]">
              ${(displayedCategoryTotal / 1e6).toFixed(1)}M Total
            </span>
          </div>
        </div>

        {/* ── Requirement 3: Quarterly Targets vs Actual (Upgraded to Vertical Chart) ── */}
        <div className="flex flex-col justify-between p-space-lg rounded-xl bg-white border border-[#E2E8F0] shadow-sm md:col-span-2 xl:col-span-1">
          <div>
            <div className="flex items-center justify-between mb-space-xs gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold truncate">
                  Quarterly Targets vs Actual
                </h2>
                <span className="material-symbols-outlined text-[#64748B] text-[18px] shrink-0">bar_chart</span>
              </div>

              {/* Dynamic Year Dropdown: All or dynamically available years */}
              <div className="flex items-center gap-1.5 shrink-0">
                <label htmlFor="quarter-year-select" className="text-xs font-semibold text-[#64748B]">
                  Year:
                </label>
                <div className="relative">
                  <select
                    id="quarter-year-select"
                    value={selectedQuarterYear}
                    onChange={(e) => {
                      setSelectedQuarterYear(e.target.value);
                      setQuarterTooltip(null);
                    }}
                    className="h-7.5 pl-2.5 pr-7 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] font-label-sm text-xs font-semibold hover:border-[#2563EB] focus:outline-none cursor-pointer appearance-none shadow-2xs"
                  >
                    <option value="All">All Years</option>
                    {availableQuarterYears.map(yr => (
                      <option key={yr} value={yr}>
                        FY {yr}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined text-[15px] text-[#64748B] absolute right-1.5 top-1.5 pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Subtitle & Legend */}
            <div className="flex flex-wrap items-center justify-between gap-1 mb-space-sm">
              <p className="font-body-sm text-body-sm text-[#475569]">
                Vertical column comparison of budget vs realized.
              </p>
              <div className="flex items-center gap-3 text-[11px] text-[#475569] font-medium shrink-0">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#2563EB]"></span>
                  <span>Actual</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#CBD5E1] border border-[#94A3B8]"></span>
                  <span>Target</span>
                </div>
              </div>
            </div>

            {/* Vertical Bar / Column Chart Canvas */}
            <div className="w-full overflow-x-auto pb-1 scroll-touch">
              <div
                ref={quarterChartContainerRef}
                onMouseLeave={() => setQuarterTooltip(null)}
                className="relative min-w-[280px] w-full h-[225px] flex flex-col justify-end pt-5"
              >
                {/* Horizontal Guide Reference Lines */}
                <div className="absolute inset-x-0 top-7 border-b border-dashed border-[#E2E8F0]" />
                <div className="absolute inset-x-0 top-18 border-b border-dashed border-[#E2E8F0]" />
                <div className="absolute inset-x-0 top-29 border-b border-dashed border-[#E2E8F0]" />
                <div className="absolute inset-x-0 bottom-12 border-b border-[#CBD5E1]" />

                {/* Dynamic Cursor-Following Tooltip at Exact Location of Pointer/Data Point */}
                {quarterTooltip !== null && parsedQuarters[quarterTooltip.idx] && (
                  <div
                    className="absolute z-30 pointer-events-none transition-all duration-75 ease-out whitespace-nowrap"
                    style={{
                      left: `${quarterTooltip.x}px`,
                      top: `${quarterTooltip.y}px`,
                      transform: `translate(${quarterTooltip.x < 110 ? '0%' : quarterTooltip.x > 320 ? '-100%' : '-50%'
                        }, ${quarterTooltip.y < 85 ? '16px' : 'calc(-100% - 14px)'
                        })`,
                    }}
                  >
                    <div className="px-3.5 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs shadow-2xl border border-slate-700/80 min-w-[190px]">
                      <div className="flex items-center justify-between gap-3 pb-1.5 mb-1.5 border-b border-slate-800">
                        <span className="font-semibold text-slate-100">
                          {parsedQuarters[quarterTooltip.idx].quarter}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold font-mono ${parsedQuarters[quarterTooltip.idx].attainmentPct >= 100
                          ? 'bg-[#166534] text-[#DCFCE7]'
                          : 'bg-[#92400E] text-[#FEF3C7]'
                          }`}>
                          {parsedQuarters[quarterTooltip.idx].attainmentPct.toFixed(1)}% Attainment
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className={`flex items-center justify-between gap-3 ${quarterTooltip.barType === 'actual' ? 'text-white font-semibold' : 'text-slate-300'
                          }`}>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-xs bg-[#2563EB] shrink-0" />
                            <span>Actual:</span>
                          </div>
                          <span className="font-mono text-[#60A5FA] font-semibold">
                            ${(parsedQuarters[quarterTooltip.idx].actual / 1e6).toFixed(1)}M
                          </span>
                        </div>

                        <div className={`flex items-center justify-between gap-3 ${quarterTooltip.barType === 'target' ? 'text-white font-semibold' : 'text-slate-300'
                          }`}>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-xs bg-[#CBD5E1] border border-[#94A3B8] shrink-0" />
                            <span>Target:</span>
                          </div>
                          <span className="font-mono text-slate-200 font-semibold">
                            ${(parsedQuarters[quarterTooltip.idx].target / 1e6).toFixed(1)}M
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Paired Vertical Columns */}
                <div className="flex items-end justify-around gap-1.5 sm:gap-2 h-[155px] z-10 px-1">
                  {parsedQuarters.map((q, idx) => {
                    const actualHeight = Math.max(6, (q.actual / maxQuarterVal) * 100);
                    const targetHeight = Math.max(6, (q.target / maxQuarterVal) * 100);
                    const isHovered = quarterTooltip?.idx === idx;

                    const handleMove = (e: React.MouseEvent<HTMLDivElement>, barType?: 'actual' | 'target') => {
                      if (!quarterChartContainerRef.current) return;
                      const rect = quarterChartContainerRef.current.getBoundingClientRect();
                      const x = Math.max(8, Math.min(e.clientX - rect.left, rect.width - 8));
                      const y = Math.max(8, Math.min(e.clientY - rect.top, rect.height - 8));
                      setQuarterTooltip({ idx, x, y, barType: barType || null });
                    };

                    return (
                      <div
                        key={`${q.quarter}-${idx}`}
                        onMouseEnter={(e) => handleMove(e)}
                        onMouseMove={(e) => handleMove(e)}
                        onMouseLeave={() => setQuarterTooltip(null)}
                        className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                      >
                        {/* Side-by-side vertical columns */}
                        <div className="flex items-end gap-1 sm:gap-1.5 w-full justify-center max-w-[56px] h-full">
                          {/* Actual Column */}
                          <div
                            onMouseEnter={(e) => {
                              e.stopPropagation();
                              handleMove(e, 'actual');
                            }}
                            onMouseMove={(e) => {
                              e.stopPropagation();
                              handleMove(e, 'actual');
                            }}
                            className={`w-3 sm:w-4 rounded-t-md transition-all duration-300 relative ${q.attainmentPct >= 100
                              ? 'bg-[#2563EB] group-hover:bg-[#1D4ED8]'
                              : 'bg-[#3B82F6] group-hover:bg-[#2563EB]'
                              } ${isHovered && quarterTooltip?.barType === 'actual' ? 'ring-2 ring-[#2563EB] ring-offset-1 scale-105' : isHovered ? 'ring-1 ring-[#2563EB]' : ''}`}
                            style={{ height: `${actualHeight}%` }}
                          />
                          {/* Target Column */}
                          <div
                            onMouseEnter={(e) => {
                              e.stopPropagation();
                              handleMove(e, 'target');
                            }}
                            onMouseMove={(e) => {
                              e.stopPropagation();
                              handleMove(e, 'target');
                            }}
                            className={`w-3 sm:w-4 bg-[#CBD5E1] group-hover:bg-[#94A3B8] rounded-t-md transition-all duration-300 relative border-t-2 border-[#94A3B8] ${isHovered && quarterTooltip?.barType === 'target' ? 'ring-2 ring-slate-400 ring-offset-1 scale-105' : isHovered ? 'ring-1 ring-slate-300' : ''
                              }`}
                            style={{ height: `${targetHeight}%` }}
                          />
                        </div>

                        {/* Quarter Label */}
                        <span className={`text-[11px] font-semibold mt-2 transition-colors whitespace-nowrap ${isHovered ? 'text-[#2563EB]' : 'text-[#0F172A]'
                          }`}>
                          {q.label}
                        </span>

                        {/* Attainment Badge */}
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium mt-0.5 whitespace-nowrap ${q.attainmentPct >= 100
                          ? 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]'
                          : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                          }`}>
                          {q.attainmentPct.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-space-md flex items-center justify-between font-label-sm text-label-sm text-[#64748B] border-t border-[#E2E8F0] mt-space-md">
            <span>
              {selectedQuarterYear === 'All' ? 'All Years' : `FY ${selectedQuarterYear}`} Attainment: {totalQuarterAttainment.toFixed(1)}%
            </span>
            <span className={`font-semibold ${totalQuarterAttainment >= 100 ? 'text-[#16A34A]' : 'text-[#D97706]'}`}>
              {totalQuarterAttainment >= 100 ? 'Exceeding Plan' : 'Near Target'}
            </span>
          </div>
        </div>
      </section>

      {/* ── Requirement 4: Top Performing Products Leaderboard (Data Table with Next Pagination) ── */}
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
                <th className="py-2.5 px-4 rounded-l-lg font-medium">Rank & Product / Machine SKU</th>
                <th className="py-2.5 px-4 font-medium">Category Group</th>
                <th className="py-2.5 px-4 font-medium text-right">Units Sold</th>
                <th className="py-2.5 px-4 font-medium text-right">Net Revenue</th>
                <th className="py-2.5 px-4 font-medium">Volume Weight</th>
                <th className="py-2.5 px-4 rounded-r-lg font-medium text-right">Margin Status</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm text-[#0F172A] divide-y divide-[#F1F5F9]">
              {displayedLeaderboardProducts.map((prod, idx) => {
                const rankNumber = startIndex + idx + 1;
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
                        <span className="font-mono text-xs font-semibold text-[#64748B] w-6 shrink-0">
                          #{rankNumber}
                        </span>
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

        {/* Table Pagination & Actions Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-space-md mt-space-sm gap-3 text-[#64748B] font-label-sm text-label-sm border-t border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"></span>
            <span>
              Showing {totalProductsCount > 0 ? startIndex + 1 : 0}–{endIndex} of {totalProductsCount} active SAP Material Master records
            </span>
          </div>

          {/* Interactive Pagination Buttons matching exact requirements */}
          <div className="flex items-center gap-2 flex-wrap">
            {showPrevButton && (
              <button
                onClick={() => setLeaderboardPage(p => Math.max(0, p - 1))}
                type="button"
                className="h-8.5 px-3 rounded-full bg-white hover:bg-[#F8FAFC] text-[#334155] border border-[#CBD5E1] font-semibold text-xs inline-flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                <span>Previous</span>
              </button>
            )}

            {/* Next button indicates how many products are still remaining */}
            {showNextButton && (
              <button
                onClick={() => setLeaderboardPage(p => p + 1)}
                type="button"
                className="h-8.5 px-4 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <span>Next ({remainingProducts} remaining)</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </button>
            )}

            <div className="flex items-center gap-2 pl-2 border-l border-[#E2E8F0] ml-1">
              <button
                onClick={exportCSV}
                className="text-[#2563EB] hover:text-[#1D4ED8] hover:underline font-semibold text-xs cursor-pointer"
                type="button"
              >
                Export CSV
              </button>
              <span>·</span>
              <button
                onClick={() => setFullCatalogueOpen(true)}
                className="text-[#2563EB] hover:text-[#1D4ED8] hover:underline font-semibold text-xs cursor-pointer"
                type="button"
              >
                View Full Catalogue
              </button>
            </div>
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
                className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A] transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 my-4 space-y-2">
              {liveProducts.map((prod, idx) => (
                <div key={prod.id} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-[#64748B] w-6 shrink-0">#{idx + 1}</span>
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
              <span className="font-label-sm text-[#64748B]">{liveProducts.length} Total Records in Working Set</span>
              <button
                onClick={() => setFullCatalogueOpen(false)}
                className="px-5 py-2 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-label-md text-label-md shadow-xs transition-colors cursor-pointer"
                type="button"
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

export default ExecutiveDashboard;
