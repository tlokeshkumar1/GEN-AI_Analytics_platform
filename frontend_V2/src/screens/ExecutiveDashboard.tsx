import React, { useState } from 'react';
import {
  TOP_PRODUCTS,
  REGIONAL_MARKET_SHARE,
  TOP_REVENUE_COUNTRIES,
  PRODUCT_CATEGORIES,
  QUARTERLY_TARGETS,
  ProductSKU,
} from '../data/mockData';

interface ExecutiveDashboardProps {
  onNavigate: (path: string) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ onNavigate }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'All' | '2025' | '2024' | '2023'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncTime, setSyncTime] = useState('2m ago');
  const [activeChartMonth, setActiveChartMonth] = useState<number>(9); // 0-11, default 9 (Oct)
  const [fullCatalogueOpen, setFullCatalogueOpen] = useState(false);

  // Period multiplier for dynamic data changes
  const periodMultiplier = {
    All: { rev: '$184.2M', profit: '$78.5M', margin: '42.6%', qty: '1,420,890' },
    '2025': { rev: '$184.2M', profit: '$78.5M', margin: '42.6%', qty: '1,420,890' },
    '2024': { rev: '$158.4M', profit: '$64.2M', margin: '40.5%', qty: '1,280,310' },
    '2023': { rev: '$134.1M', profit: '$52.8M', margin: '39.3%', qty: '1,110,400' },
  }[selectedPeriod];

  // Month data for chart
  const monthlyData = [
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

  const currentHoverPoint = monthlyData[activeChartMonth];

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSyncTime('Just now');
    }, 800);
  };

  const filteredProducts = TOP_PRODUCTS.filter(p =>
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
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-outline">
              Enterprise Intelligence · Fiscal Year 2023 – 2025
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm">
              HANA Stream Sync: {syncTime}
            </span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
            Executive Sales & Analytics Dashboard
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Real-time enterprise metrics & machine-learning projections powered by SAP HANA Vector & AI Core.
          </p>
        </div>

        {/* Header Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap shrink-0 self-start lg:self-end mt-2 lg:mt-0">
          <button 
            onClick={handleSync}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors shadow-sm border border-[#e2e3e1] whitespace-nowrap shrink-0" 
            type="button"
          >
            <span className={`material-symbols-outlined text-[16px] text-outline ${syncing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>{syncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          <button 
            onClick={() => onNavigate('upload-dataset')}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors shadow-sm border border-[#e2e3e1] whitespace-nowrap shrink-0" 
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-outline">upload_file</span>
            <span>Upload Data</span>
          </button>

          <button 
            onClick={() => onNavigate('build-your-kpi-graph-studio')}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors shadow-sm border border-[#e2e3e1] whitespace-nowrap shrink-0" 
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-outline">query_stats</span>
            <span>Custom Graph</span>
          </button>

          <button 
            onClick={() => onNavigate('ai-dashboards-rag-chat')}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors shadow-sm border border-[#e2e3e1] whitespace-nowrap shrink-0" 
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-outline">chat</span>
            <span>RAG Chat</span>
          </button>
        </div>
      </section>

      {/* KPI Quadrant Cards Grid (4 Columns) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-lg sm:mb-space-xl">
        {/* Card 1: Total Net Revenue */}
        <div className="flex flex-col justify-between p-[22px] rounded-xl bg-surface-container-lowest shadow-sm hover:bg-surface-container-low transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md uppercase tracking-wider text-outline">
                Total Net Revenue
              </span>
              <span className="font-headline-lg text-headline-lg text-on-surface font-semibold mt-1">
                {periodMultiplier.rev}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-surface-container-low">
              <span className="material-symbols-outlined text-[20px] text-on-surface">payments</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-space-md pt-space-xs">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-on-surface">trending_up</span>
              <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                +14.8% YoY
              </span>
            </div>
            {/* Sparkline SVG */}
            <svg className="w-20 h-6 text-on-surface" fill="none" viewBox="0 0 80 24">
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

        {/* Card 2: Quantity Sold */}
        <div className="flex flex-col justify-between p-[22px] rounded-xl bg-surface-container-lowest shadow-sm hover:bg-surface-container-low transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md uppercase tracking-wider text-outline">
                Total Quantity Sold
              </span>
              <span className="font-headline-lg text-headline-lg text-on-surface font-semibold mt-1">
                {periodMultiplier.qty}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-surface-container-low">
              <span className="material-symbols-outlined text-[20px] text-on-surface">inventory_2</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-space-md pt-space-xs">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-on-surface">check</span>
              <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                +8.2% vs Plan
              </span>
            </div>
            <svg className="w-20 h-6 text-secondary" fill="none" viewBox="0 0 80 24">
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

        {/* Card 3: Gross Margin */}
        <div className="flex flex-col justify-between p-[22px] rounded-xl bg-surface-container-lowest shadow-sm hover:bg-surface-container-low transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md uppercase tracking-wider text-outline">
                Gross Margin
              </span>
              <span className="font-headline-lg text-headline-lg text-on-surface font-semibold mt-1">
                {periodMultiplier.margin}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-surface-container-low">
              <span className="material-symbols-outlined text-[20px] text-on-surface">pie_chart</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-space-md pt-space-xs">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-on-surface">arrow_outward</span>
              <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                +2.4 pts expansion
              </span>
            </div>
            <svg className="w-20 h-6 text-outline" fill="none" viewBox="0 0 80 24">
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

        {/* Card 4: Active Countries */}
        <div className="flex flex-col justify-between p-[22px] rounded-xl bg-surface-container-lowest shadow-sm hover:bg-surface-container-low transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md uppercase tracking-wider text-outline">
                Active Countries
              </span>
              <span className="font-headline-lg text-headline-lg text-on-surface font-semibold mt-1">
                15 Markets
              </span>
            </div>
            <div className="p-2 rounded-xl bg-surface-container-low">
              <span className="material-symbols-outlined text-[20px] text-on-surface">public</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-space-md pt-space-xs">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Global Tier-1 Footprint
              </span>
            </div>
            <span className="font-label-sm text-label-sm font-medium text-outline">
              100% Operational
            </span>
          </div>
        </div>
      </section>

      {/* Row 1: Dual-Line Enterprise Revenue Timeline + Regional Market Share Bento (8 / 4 Grid) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-md mb-space-md">
        {/* Main Dual Line Analytics Panel (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between p-space-lg rounded-xl bg-surface-container-lowest shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md">
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Monthly Net Revenue & Gross Profit
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Historical performance curves across discrete ledger cycles.
              </p>
            </div>
            {/* Segmented Filter Pills */}
            <div className="flex items-center p-1 rounded-full bg-surface-container self-start">
              {(['All', '2025', '2024', '2023'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1 rounded-full font-label-sm text-label-sm transition-all ${
                    selectedPeriod === period
                      ? 'bg-surface-container-lowest text-on-surface shadow-sm font-medium'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                  type="button"
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* Financial Metrics Summary Band */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-space-sm p-3 sm:p-space-md rounded-xl bg-surface-container-low mb-space-md sm:mb-space-lg">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                Period Revenue
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-0.5">
                {periodMultiplier.rev}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                Gross Profit
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-0.5">
                {periodMultiplier.profit}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                Avg Profit Margin
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-0.5">
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
                  <stop offset="0%" stopColor="#111111" stopOpacity="0.12"></stop>
                  <stop offset="100%" stopColor="#111111" stopOpacity="0.0"></stop>
                </linearGradient>
                <linearGradient id="marginGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#747878" stopOpacity="0.10"></stop>
                  <stop offset="100%" stopColor="#747878" stopOpacity="0.0"></stop>
                </linearGradient>
              </defs>

              {/* Horizontal Grid Guides */}
              <line stroke="#eeeeec" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="680" y1="20" y2="20" />
              <line stroke="#eeeeec" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="680" y1="70" y2="70" />
              <line stroke="#eeeeec" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="680" y1="120" y2="120" />
              <line stroke="#eeeeec" strokeWidth="1" x1="0" x2="680" y1="170" y2="170" />

              {/* Area Fills */}
              <polygon fill="url(#revenueGrad)" points="20,130 80,120 140,110 200,95 260,80 320,88 380,68 440,55 500,60 560,40 620,30 660,24 660,170 20,170" />
              <polygon fill="url(#marginGrad)" points="20,150 80,144 140,140 200,132 260,124 320,128 380,118 440,110 500,114 560,102 620,95 660,90 660,170 20,170" />

              {/* Net Revenue Curve (Solid Dark #111111) */}
              <path 
                d="M 20 130 C 50 125, 60 120, 80 120 C 110 120, 120 112, 140 110 C 170 108, 180 97, 200 95 C 230 92, 240 82, 260 80 C 290 78, 300 89, 320 88 C 350 87, 360 70, 380 68 C 410 65, 420 57, 440 55 C 470 53, 480 61, 500 60 C 530 58, 540 42, 560 40 C 590 38, 600 32, 620 30 L 660 24" 
                fill="none" 
                stroke="#1a1c1b" 
                strokeLinecap="round" 
                strokeWidth="2.5" 
              />

              {/* Gross Profit Curve (Muted Secondary) */}
              <path 
                d="M 20 150 C 50 147, 60 145, 80 144 C 110 142, 120 141, 140 140 C 170 138, 180 133, 200 132 C 230 130, 240 125, 260 124 C 290 123, 300 129, 320 128 C 350 126, 360 119, 380 118 C 410 116, 420 112, 440 110 C 470 108, 480 115, 500 114 C 530 112, 540 103, 560 102 C 590 100, 600 96, 620 95 L 660 90" 
                fill="none" 
                stroke="#747878" 
                strokeDasharray="2 2" 
                strokeLinecap="round" 
                strokeWidth="2" 
              />

              {/* Active Marker Pointer */}
              <line stroke="#dadad8" strokeWidth="1" x1={currentHoverPoint.x} x2={currentHoverPoint.x} y1="20" y2="170" />
              <circle cx={currentHoverPoint.x} cy={currentHoverPoint.revY} fill="#1a1c1b" r="4.5" stroke="#ffffff" strokeWidth="2" />
              <circle cx={currentHoverPoint.x} cy={currentHoverPoint.profitY} fill="#747878" r="3.5" stroke="#ffffff" strokeWidth="2" />
            </svg>

            {/* Tooltip Visual Callout */}
            <div 
              className="absolute top-2 p-2 rounded-lg bg-surface-container text-on-surface shadow-sm text-left transition-all duration-200 pointer-events-none"
              style={{
                left: `${Math.min(Math.max(currentHoverPoint.x - 40, 20), 520)}px`
              }}
            >
              <span className="font-label-sm text-label-sm font-semibold uppercase">
                {currentHoverPoint.month} Realized
              </span>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="font-body-sm text-body-sm font-semibold text-on-surface">
                  Rev: ${currentHoverPoint.rev}M
                </span>
                <span className="font-body-sm text-body-sm text-outline">
                  Profit: ${currentHoverPoint.profit}M
                </span>
              </div>
            </div>

            {/* Timeline X-Ticks (Interactive click or hover to inspect month) */}
            <div className="flex justify-between items-center pt-2 text-outline font-label-sm text-label-sm select-none">
              {monthlyData.map((m, idx) => (
                <button
                  key={m.month}
                  onClick={() => setActiveChartMonth(idx)}
                  className={`hover:text-on-surface transition-colors ${
                    activeChartMonth === idx ? 'font-semibold text-on-surface scale-110' : ''
                  }`}
                >
                  {m.month}
                </button>
              ))}
            </div>
          </div>
        </div>

          {/* Chart Legend Footer */}
          <div className="flex flex-wrap items-center justify-between gap-space-md pt-space-md mt-space-sm border-t border-[#eeeeec]">
            <div className="flex flex-wrap items-center gap-space-md">
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-primary"></span>
                <span className="font-label-sm text-label-sm text-on-surface font-medium">
                  Net Revenue (Realized)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-outline"></span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                  Gross Margin Allocation
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-outline">
              <span className="material-symbols-outlined text-[14px]">tune</span>
              <span className="font-label-sm text-label-sm">Variance: ±1.2%</span>
            </div>
          </div>
        </div>

        {/* Regional Market Share Panel (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between p-space-lg rounded-xl bg-surface-container-lowest shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Regional Market Share
              </h2>
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                GEO-4
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-lg">
              Global enterprise revenue contribution mapped across operating theaters.
            </p>

            {/* Ranked Regional Distribution Rows */}
            <div className="flex flex-col gap-space-md">
              {REGIONAL_MARKET_SHARE.map((reg) => (
                <div key={reg.name} className="flex flex-col">
                  <div className="flex items-center justify-between font-label-md text-label-md mb-1.5">
                    <span className="font-medium text-on-surface">{reg.rank} {reg.name}</span>
                    <span className="text-on-surface font-semibold">{reg.revenue} · {reg.percentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${reg.colorClass} transition-all duration-500`}
                      style={{ width: `${reg.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Regional Insight Badge */}
          <div className="p-space-md rounded-xl bg-surface-container-low mt-space-lg border border-[#eeeeec]">
            <div className="flex items-start gap-space-sm">
              <span className="material-symbols-outlined text-on-surface text-[18px]">verified</span>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                  HANA Geo-Clustering Insight
                </span>
                <p className="font-body-sm text-body-sm text-outline mt-0.5">
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
        <div className="flex flex-col justify-between p-space-lg rounded-xl bg-surface-container-lowest shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-space-xs">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Top Revenue by Country
              </h2>
              <span className="material-symbols-outlined text-outline text-[18px]">flag</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
              Leading sovereign market sales volumes.
            </p>

            {/* Horizontal Bar Rankings */}
            <div className="flex flex-col gap-3.5">
              {TOP_REVENUE_COUNTRIES.map((c) => (
                <div key={c.country} className="flex flex-col">
                  <div className="flex justify-between items-center font-label-md text-label-md mb-1">
                    <span className="text-on-surface font-medium">{c.country}</span>
                    <span className="font-semibold text-on-surface">{c.revenue}</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-surface-container overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${c.colorClass} transition-all duration-500`}
                      style={{ width: `${c.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-space-md flex items-center justify-between text-outline font-label-sm text-label-sm border-t border-[#eeeeec] mt-space-md">
            <span>Combined Top 5: $144.0M</span>
            <span className="font-semibold text-on-surface">78.1% of Total</span>
          </div>
        </div>

        {/* Product Category Revenue */}
        <div className="flex flex-col justify-between p-space-lg rounded-xl bg-surface-container-lowest shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-space-xs">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Product Category Revenue
              </h2>
              <span className="material-symbols-outlined text-outline text-[18px]">category</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
              Allocation across high-margin business lines.
            </p>

            <div className="space-y-3">
              {PRODUCT_CATEGORIES.map((cat) => (
                <div key={cat.category} className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between hover:bg-surface-container transition-colors">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-label-md text-label-md font-medium text-on-surface truncate">
                      {cat.category}
                    </span>
                    <span className="font-label-sm text-label-sm text-outline">
                      {cat.description}
                    </span>
                  </div>
                  <span className="font-body-md text-body-md font-semibold text-on-surface whitespace-nowrap">
                    {cat.revenue}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-space-md flex items-center justify-between font-label-sm text-label-sm text-outline border-t border-[#eeeeec] mt-space-md">
            <span>5 Core Clusters</span>
            <span className="text-on-surface font-semibold">↑ Robotics (+29%)</span>
          </div>
        </div>

        {/* Quarterly Targets vs Actual */}
        <div className="flex flex-col justify-between p-space-lg rounded-xl bg-surface-container-lowest shadow-sm md:col-span-2 xl:col-span-1">
          <div>
            <div className="flex items-center justify-between mb-space-xs">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Quarterly Targets vs Actual
              </h2>
              <span className="material-symbols-outlined text-outline text-[18px]">track_changes</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
              Budget plan attainment by fiscal quarter.
            </p>

            {/* Attainment Visual Grid */}
            <div className="flex flex-col gap-4">
              {QUARTERLY_TARGETS.map((tgt) => (
                <div key={tgt.quarter} className="flex flex-col">
                  <div className="flex items-center justify-between font-label-md text-label-md mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-on-surface">{tgt.quarter}</span>
                      <span className={`font-label-sm text-label-sm px-1.5 py-0.5 rounded-full ${
                        tgt.isForecast ? 'bg-surface-container text-outline' : 'bg-surface-container text-on-surface'
                      } font-medium`}>
                        {tgt.attainmentLabel}
                      </span>
                    </div>
                    <span className="text-on-surface-variant font-body-sm text-body-sm">
                      {tgt.actualVsTarget}
                    </span>
                  </div>
                  <div className="relative w-full h-3 rounded-full bg-surface-container overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        tgt.isForecast ? 'bg-secondary' : 'bg-primary'
                      } transition-all duration-500`}
                      style={{ width: `${Math.min(tgt.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-space-md flex items-center justify-between font-label-sm text-label-sm text-outline border-t border-[#eeeeec] mt-space-md">
            <span>Year-to-date attainment: 102.8%</span>
            <span className="text-on-surface font-semibold">Exceeding Plan</span>
          </div>
        </div>
      </section>

      {/* Editorial Section: Top Performing Products Leaderboard (Data Table) */}
      <section className="flex flex-col p-space-lg rounded-xl bg-surface-container-lowest shadow-sm mb-space-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md mb-space-md">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Top Performing Products Leaderboard
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Realized operational sales volume by individual enterprise stock keeping units (SKUs).
            </p>
          </div>

          {/* Search Input Filter */}
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[16px]">
              search
            </span>
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:bg-surface-container transition-colors" 
              placeholder="Filter product names..." 
              type="text"
            />
          </div>
        </div>

        {/* Mobile Swipe Hint */}
        <div className="flex md:hidden items-center gap-1.5 text-outline text-[11px] mb-2 px-1">
          <span className="material-symbols-outlined text-[14px]">swipe</span>
          <span>Swipe horizontally to inspect all SKU columns</span>
        </div>

        {/* Data Table Canvas */}
        <div className="w-full overflow-x-auto pb-1 scroll-touch">
          <table className="w-full min-w-[620px] text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low font-label-md text-label-md uppercase tracking-wider text-outline">
                <th className="py-2.5 px-4 rounded-l-lg font-medium">Product / Machine SKU</th>
                <th className="py-2.5 px-4 font-medium">Category Group</th>
                <th className="py-2.5 px-4 font-medium text-right">Units Sold</th>
                <th className="py-2.5 px-4 font-medium text-right">Net Revenue</th>
                <th className="py-2.5 px-4 font-medium">Volume Weight</th>
                <th className="py-2.5 px-4 rounded-r-lg font-medium text-right">Margin Status</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-[#f4f4f2]">
              {filteredProducts.map((prod) => (
                <tr key={prod.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="py-3.5 px-4 font-medium">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${prod.statusColor}`}></span>
                      <span className="text-on-surface font-semibold">{prod.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-on-surface-variant">{prod.category}</td>
                  <td className="py-3.5 px-4 text-right font-medium font-mono">
                    {prod.unitsSold.toLocaleString()} units
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-on-surface font-mono">
                    {prod.netRevenueFormatted}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="w-24 h-2 rounded-full bg-surface-container overflow-hidden">
                      <div 
                        className={`h-full ${prod.statusColor} rounded-full transition-all duration-300`} 
                        style={{ width: `${prod.volumeWeight}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-mono font-medium">
                      {prod.marginStatus}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Pagination / Summary Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-space-md mt-space-sm gap-2 text-outline font-label-sm text-label-sm border-t border-[#eeeeec]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            <span>Showing {filteredProducts.length} of 184 active SAP Material Master records</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportCSV}
              className="text-on-surface hover:underline font-medium" 
              type="button"
            >
              Export CSV
            </button>
            <span>·</span>
            <button 
              onClick={() => setFullCatalogueOpen(true)}
              className="text-on-surface hover:underline font-medium" 
              type="button"
            >
              View Full Catalogue
            </button>
          </div>
        </div>
      </section>

      {/* Editorial Bottom Micro-Card Strip (SAP Intelligence Pipeline Telemetry) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-space-md mb-space-xl">
        <div className="p-space-md rounded-xl bg-surface-container-lowest flex items-center justify-between shadow-sm border border-[#eeeeec]">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[20px] text-on-surface">database</span>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface font-medium">HANA In-Memory Core</span>
              <span className="font-label-sm text-label-sm text-outline">Query Latency: 12ms</span>
            </div>
          </div>
          <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-medium">
            Optimized
          </span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest flex items-center justify-between shadow-sm border border-[#eeeeec]">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[20px] text-on-surface">psychology</span>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface font-medium">AI Core Inference Engine</span>
              <span className="font-label-sm text-label-sm text-outline">Llama-3.2 90B Vectorized</span>
            </div>
          </div>
          <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-medium">
            Online
          </span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest flex items-center justify-between shadow-sm border border-[#eeeeec]">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[20px] text-on-surface">security</span>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface font-medium">Enterprise Role Audit</span>
              <span className="font-label-sm text-label-sm text-outline">Tier-1 Access Controlled</span>
            </div>
          </div>
          <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-medium">
            Compliant
          </span>
        </div>
      </section>

      {/* Full Catalogue Modal */}
      {fullCatalogueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div 
            className="fixed inset-0" 
            onClick={() => setFullCatalogueOpen(false)} 
          />
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 max-h-[85vh] flex flex-col z-10 border border-[#dadad8]">
            <div className="flex items-center justify-between pb-4 border-b border-[#eeeeec]">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  SAP Material Master Active Catalog
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  All enterprise stock keeping units linked to HANA column store
                </p>
              </div>
              <button 
                onClick={() => setFullCatalogueOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 my-4 space-y-2">
              {TOP_PRODUCTS.map((prod) => (
                <div key={prod.id} className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${prod.statusColor}`}></span>
                    <div>
                      <div className="font-label-md text-on-surface font-semibold">{prod.name}</div>
                      <div className="font-label-sm text-outline">{prod.skuCode} · {prod.category} · {prod.region}</div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-label-md font-semibold text-on-surface">{prod.netRevenueFormatted}</div>
                    <div className="font-label-sm text-outline">{prod.marginStatus}% margin</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#eeeeec] flex justify-between items-center">
              <span className="font-label-sm text-outline">184 Total Records in Working Set</span>
              <button 
                onClick={() => setFullCatalogueOpen(false)}
                className="px-5 py-2 rounded-full bg-primary text-on-primary font-label-md text-label-md"
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
