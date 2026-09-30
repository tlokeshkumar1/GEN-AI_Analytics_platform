import React, { useState, useEffect } from 'react';
import { SCHEMA_COLUMNS } from '../data/mockData';
import { generateCustomGraph, GraphResponse } from '../services/graphService';

const PIPELINE_STEPS = [
  'Schema & Temp Init: Inspecting schema & initializing script runtime…',
  'Intent & Parameters: Resolving target dimension, metric & chart type…',
  'Data Aggregation: Aggregating & filtering HANA column-store dataset…',
  'Data Reconciliation: Validating pre-computed aggregated measures…',
  'Script Generation: Synthesizing Matplotlib Python code via SAP AI Core…',
  'Subprocess Execution: Running Python script in isolated subprocess…',
  'Image Encoding: Converting generated Matplotlib figure to base64…',
  'Insight Generation: Synthesizing analytical executive summary…',
];

const GraphStudioSkeleton: React.FC = () => {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx((prev) => Math.min(prev + 1, PIPELINE_STEPS.length - 1));
    }, 450);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-6 my-6 animate-in fade-in">
      <div className="w-full h-64 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center text-[#7C3AED] ring-8 ring-violet-50/50">
            <span className="material-symbols-outlined text-[28px] animate-spin">refresh</span>
          </div>
          <div className="text-center">
            <div className="font-label-md text-slate-800 font-semibold text-base">Executing Python Graph Agent Pipeline…</div>
            <div className="text-xs text-slate-500 mt-0.5">POST /graph/generate · SAP AI Core Subprocess</div>
          </div>
        </div>
      </div>
      <div className="space-y-2 max-w-lg mx-auto pt-2">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono font-medium pb-1 border-b border-slate-100">
          <span>BACKEND EXECUTION STAGES</span>
          <span>{stepIdx + 1} of {PIPELINE_STEPS.length}</span>
        </div>
        {PIPELINE_STEPS.map((step, i) => (
          <div
            key={step}
            className={`flex items-center gap-3 text-xs transition-all duration-300 ${i < stepIdx
                ? 'text-emerald-700 font-medium'
                : i === stepIdx
                  ? 'text-[#2563EB] font-semibold'
                  : 'text-slate-400'
              }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${i < stepIdx
                  ? 'bg-emerald-100 text-emerald-700'
                  : i === stepIdx
                    ? 'bg-[#2563EB] text-white animate-pulse'
                    : 'bg-slate-100 text-slate-400'
                }`}
            >
              {i < stepIdx ? '✓' : i + 1}
            </div>
            <span className="truncate">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface GraphStudioProps {
  initialPrompt?: string;
  onNavigate: (path: string) => void;
}

export const GraphStudio: React.FC<GraphStudioProps> = ({
  initialPrompt = 'Show monthly Net Revenue and Gross Margin comparison across 2024 and 2025 as a dual-axis trendline with milestone annotations',
  onNavigate,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [chartType, setChartType] = useState('Auto-detect chart type');
  const [dimension, setDimension] = useState('MonthLabel');
  const [metric, setMetric] = useState('NetRevenueUSD');
  const [aggregation, setAggregation] = useState('SUM');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Modals & Drawers
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [expandedViewOpen, setExpandedViewOpen] = useState(false);
  const [schemaFilter, setSchemaFilter] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live backend graph result
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [backendInsights, setBackendInsights] = useState<string | null>(null);
  const [recordsMatched, setRecordsMatched] = useState<number | null>(null);
  const [generatedChartType, setGeneratedChartType] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // History entries
  const [queryHistory, setQueryHistory] = useState([
    {
      query: 'Show monthly Net Revenue and Gross Margin comparison across 2024 and 2025 as a dual-axis trendline with milestone annotations',
      timestamp: '2 mins ago',
      type: 'Dual-Axis Spline',
    },
    {
      query: 'Quarterly gross profit comparison across 2023, 2024, and 2025 by Product Line',
      timestamp: '1 hour ago',
      type: 'Grouped Bar',
    },
    {
      query: 'Compare Net Revenue and Gross Margin percentage across EMEA, NA, APAC, and LATAM regions',
      timestamp: 'Yesterday',
      type: 'Geo Dual',
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const [res] = await Promise.all([
        generateCustomGraph(prompt),
        new Promise((resolve) => setTimeout(resolve, 3600)),
      ]);
      setGeneratedImage(res.image_base64);
      setBackendInsights(res.insights ?? null);
      setRecordsMatched(res.records_matched ?? null);
      setGeneratedChartType(res.chart_type ?? null);
      showToast('Visualization generated from HANA column store');
      // Append to history
      setQueryHistory(prev => [
        { query: prompt, timestamp: 'Just now', type: res.chart_type ?? chartType.replace('Auto-detect chart type', 'Auto') },
        ...prev.slice(0, 8),
      ]);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Graph generation failed';
      setErrorMessage(detail);
      showToast(`Error: ${detail}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePresetClick = async (presetPrompt: string, name: string) => {
    setPrompt(presetPrompt);
    setActivePreset(name);
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const [res] = await Promise.all([
        generateCustomGraph(presetPrompt),
        new Promise((resolve) => setTimeout(resolve, 3600)),
      ]);
      setGeneratedImage(res.image_base64);
      setBackendInsights(res.insights ?? null);
      setRecordsMatched(res.records_matched ?? null);
      setGeneratedChartType(res.chart_type ?? null);
      showToast(`Applied preset: ${name}`);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Preset generation failed';
      setErrorMessage(detail);
      showToast(`Error: ${detail}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAppendColumn = (columnName: string) => {
    setPrompt(prev => `${prev.trim()} grouped by ${columnName}`);
    showToast(`Appended "${columnName}" to query`);
  };

  const copyPythonCode = () => {
    const code = `# SAP HANA Vector & AI Core - Auto-Generated Visualization Script
import pandas as pd
import matplotlib.pyplot as plt
from hdbcli import dbapi

# Connect to SAP HANA Cloud Column Store
conn = dbapi.connect(
    address="zeus.hana.prod.eu-central-1.hanacloud.ondemand.com",
    port=443,
    user="ANALYTICS_USER",
    password="***"
)

query = """
SELECT 
    "MonthLabel",
    SUM("NetRevenueUSD") / 1e6 AS "NetRevenueM",
    AVG("GrossMarginPercent") * 100 AS "GrossMarginPct"
FROM "NEOVATIC_DB"."SALES_FACT"
WHERE "SalesDate" >= '2024-01-01'
GROUP BY "MonthLabel"
ORDER BY MIN("SalesDate") ASC;
"""

df = pd.read_sql(query, conn)

fig, ax1 = plt.subplots(figsize=(12, 6))
color = '#111111'
ax1.set_xlabel('Fiscal Period')
ax1.set_ylabel('Net Revenue ($M)', color=color)
ax1.plot(df['MonthLabel'], df['NetRevenueM'], color=color, linewidth=2.5, marker='o')

ax2 = ax1.twinx()
color2 = '#547A9B'
ax2.set_ylabel('Gross Margin (%)', color=color2)
ax2.plot(df['MonthLabel'], df['GrossMarginPct'], color=color2, linewidth=2, linestyle='--', marker='s')

plt.title('Monthly Net Revenue vs Gross Margin (SAP HANA Real-Time)')
plt.grid(True, linestyle=':', alpha=0.6)
plt.savefig('hana_sales_visualization.png', dpi=300)
print("Chart generated successfully.")
`;
    navigator.clipboard?.writeText(code);
    showToast('Python code copied to clipboard!');
  };

  const handleDownload = () => {
    if (!generatedImage) {
      showToast('No generated graph to download');
      return;
    }
    const a = document.createElement('a');
    a.href = generatedImage;
    const isSvg = generatedImage.includes('image/svg+xml');
    a.download = `HANA_Generated_Chart_${Date.now()}.${isSvg ? 'svg' : 'png'}`;
    a.click();
    showToast(`Graph downloaded as ${isSvg ? 'SVG' : 'PNG'}`);
  };

  const filteredSchema = SCHEMA_COLUMNS.filter(col =>
    col.name.toLowerCase().includes(schemaFilter.toLowerCase()) ||
    col.description.toLowerCase().includes(schemaFilter.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#111111] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 font-label-md text-label-md animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation & Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg mb-space-xl">
        <div>
          <div className="flex items-center gap-space-xs text-outline mb-space-xs">
            <span className="font-label-sm text-label-sm uppercase tracking-widest font-semibold text-outline">
              GRAPH STUDIO · NATURAL LANGUAGE VISUALIZATION
            </span>
            <span className="w-1 h-1 rounded-full bg-outline"></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
              SAP HANA Analytical View v4.2
            </span>
          </div>
          <h1 className="font-headline-xl text-headline-xl tracking-tight text-on-surface">
            Custom Graph Studio
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-2xl">
            Generate instant multi-dimensional charts, correlation matrices, and statistical insights using conversational natural language directly linked to HANA In-Memory Column Store.
          </p>
        </div>

        {/* Global Canvas Actions */}
        <div className="flex items-center gap-space-sm self-start lg:self-auto flex-wrap">
          <button
            onClick={() => setSchemaModalOpen(true)}
            className="flex items-center gap-space-xs px-4 py-2 rounded-full bg-white hover:bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] transition-colors font-label-md text-label-md shadow-2xs"
            id="schemaModalTrigger"
          >
            <span className="material-symbols-outlined text-[16px] text-[#2563EB]">database</span>
            <span>Schema Columns (39 Available)</span>
          </button>

          <button
            onClick={() => setHistoryModalOpen(true)}
            className="flex items-center gap-space-xs px-4 py-2 rounded-full bg-white hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A] border border-[#CBD5E1] transition-colors font-label-md text-label-md shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">history</span>
            <span>History</span>
          </button>

          <button
            onClick={() => setConfigModalOpen(true)}
            className="flex items-center gap-space-xs px-4 py-2 rounded-full bg-white hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A] border border-[#CBD5E1] transition-colors font-label-md text-label-md shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>Studio Config</span>
          </button>
        </div>
      </div>

      {/* Main Studio Panel */}
      <div className="bg-[#F8FAFC] p-6 lg:p-7 rounded-2xl shadow-sm mb-space-xl border border-[#E2E8F0]">
        {/* Prompt Editor Box */}
        <div className="bg-white p-5 rounded-xl shadow-xs mb-6 border border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#7C3AED] text-[18px]">auto_awesome</span>
              <span className="font-label-md text-label-md uppercase tracking-wider text-[#64748B] font-semibold">
                Llama-3.2 Query Formulation Engine
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm text-[#64748B]">Deterministic SQL · Strict Bounds</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"></span>
            </div>
          </div>

          {/* Natural Language Textarea */}
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-transparent resize-none font-body-lg text-body-lg text-[#0F172A] placeholder:text-[#64748B] focus:outline-none leading-relaxed"
              id="promptInput"
              placeholder="Ask a question or describe the analytical chart you want to build..."
              rows={2}
            />
          </div>

          {/* Control Bar Inside Editor */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-2 border-t border-[#E2E8F0]">
            <div className="flex flex-wrap items-center gap-2">
              {/* Chart Type Dropdown Pill */}
              <div className="relative">
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                  className="appearance-none flex items-center gap-1.5 pl-3 pr-7 py-1.5 rounded-full bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] font-label-md text-label-md cursor-pointer border border-[#E2E8F0] focus:outline-none focus:border-[#2563EB]"
                >
                  <option>Auto-detect chart type</option>
                  <option>Dual-Axis Spline</option>
                  <option>Grouped Cohort Bar</option>
                  <option>Proportional Donut</option>
                  <option>Horizontal Ranking</option>
                  <option>Regional Geo Dual</option>
                  <option>Scatter Regression</option>
                </select>
                <span className="material-symbols-outlined text-[14px] text-[#64748B] absolute right-2.5 top-2 pointer-events-none">
                  expand_more
                </span>
              </div>

              {/* Dimension Dropdown Pill */}
              <div className="relative">
                <select
                  value={dimension}
                  onChange={(e) => setDimension(e.target.value)}
                  className="appearance-none flex items-center gap-1.5 pl-3 pr-7 py-1.5 rounded-full bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] font-label-md text-label-md cursor-pointer border border-[#E2E8F0] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="MonthLabel">DIM: MonthLabel</option>
                  <option value="Category">DIM: Category</option>
                  <option value="Region">DIM: Region</option>
                  <option value="Country">DIM: Country</option>
                  <option value="Product">DIM: Product</option>
                  <option value="SalesQuarter">DIM: SalesQuarter</option>
                </select>
                <span className="material-symbols-outlined text-[14px] text-[#64748B] absolute right-2.5 top-2 pointer-events-none">
                  expand_more
                </span>
              </div>

              {/* Metric Dropdown Pill */}
              <div className="relative">
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  className="appearance-none flex items-center gap-1.5 pl-3 pr-7 py-1.5 rounded-full bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] font-label-md text-label-md cursor-pointer border border-[#E2E8F0] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="NetRevenueUSD">VAL: NetRevenueUSD</option>
                  <option value="GrossMarginUSD">VAL: GrossMarginUSD</option>
                  <option value="GrossMarginPercent">VAL: GrossMarginPercent</option>
                  <option value="Quantity">VAL: Quantity</option>
                  <option value="DiscountPercent">VAL: DiscountPercent</option>
                </select>
                <span className="material-symbols-outlined text-[14px] text-[#64748B] absolute right-2.5 top-2 pointer-events-none">
                  expand_more
                </span>
              </div>

              {/* Aggregation Pill */}
              <button
                onClick={() => setAggregation(prev => prev === 'SUM' ? 'AVG' : prev === 'AVG' ? 'COUNT' : 'SUM')}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] font-label-sm text-label-sm hover:bg-[#DBEAFE] transition-colors"
                title="Click to cycle aggregation: SUM, AVG, COUNT"
              >
                <span>Σ Agg: {aggregation}</span>
              </button>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full sm:w-auto justify-center flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-label-md text-label-md shadow-xs transition-all disabled:opacity-70"
              id="generateBtn"
            >
              {isGenerating ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                  <span>Generate Visualization</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Presets Grid */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="font-label-md text-label-md uppercase tracking-wider text-[#64748B] font-semibold">
              Instant Graph Blueprints
            </span>
            <span className="font-label-sm text-label-sm text-[#475569] font-medium">
              Click to populate
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Preset 1 */}
            <button
              onClick={() => handlePresetClick('Monthly revenue trend with 30-day rolling moving average and seasonal band', 'SPLINE')}
              className={`preset-card group text-left p-3.5 rounded-xl bg-white hover:bg-[#F8FAFC] transition-all shadow-xs flex flex-col justify-between h-28 border ${activePreset === 'SPLINE' ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 bg-[#EFF6FF]/40' : 'border-[#E2E8F0]'
                }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="material-symbols-outlined text-[18px] text-[#2563EB]">
                  show_chart
                </span>
                <span className="font-label-sm text-label-sm text-[#64748B]">SPLINE</span>
              </div>
              <div>
                <div className="font-label-md text-label-md text-[#0F172A] font-medium truncate">Monthly revenue trend</div>
                <div className="font-label-sm text-label-sm text-[#64748B] truncate">Smooth shaded area</div>
              </div>
            </button>

            {/* Preset 2 */}
            <button
              onClick={() => handlePresetClick('Quarterly gross profit comparison across 2023, 2024, and 2025 by Product Line', 'GROUPED')}
              className={`preset-card group text-left p-3.5 rounded-xl bg-white hover:bg-[#F8FAFC] transition-all shadow-xs flex flex-col justify-between h-28 border ${activePreset === 'GROUPED' ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 bg-[#EFF6FF]/40' : 'border-[#E2E8F0]'
                }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="material-symbols-outlined text-[18px] text-[#4F46E5]">
                  bar_chart
                </span>
                <span className="font-label-sm text-label-sm text-[#64748B]">GROUPED</span>
              </div>
              <div>
                <div className="font-label-md text-label-md text-[#0F172A] font-medium truncate">Quarterly profit delta</div>
                <div className="font-label-sm text-label-sm text-[#64748B] truncate">2023–2025 cohort bars</div>
              </div>
            </button>

            {/* Preset 3 */}
            <button
              onClick={() => handlePresetClick('Revenue contribution by commercial category as a proportional donut chart with percent callouts', 'DONUT')}
              className={`preset-card group text-left p-3.5 rounded-xl bg-white hover:bg-[#F8FAFC] transition-all shadow-xs flex flex-col justify-between h-28 border ${activePreset === 'DONUT' ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 bg-[#EFF6FF]/40' : 'border-[#E2E8F0]'
                }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="material-symbols-outlined text-[18px] text-[#7C3AED]">
                  donut_large
                </span>
                <span className="font-label-sm text-label-sm text-[#64748B]">DONUT</span>
              </div>
              <div>
                <div className="font-label-md text-label-md text-[#0F172A] font-medium truncate">Revenue by category</div>
                <div className="font-label-sm text-label-sm text-[#64748B] truncate">Percentage allocation</div>
              </div>
            </button>

            {/* Preset 4 */}
            <button
              onClick={() => handlePresetClick('Top 10 products ranked by total gross margin USD in descending order', 'RANKING')}
              className={`preset-card group text-left p-3.5 rounded-xl bg-white hover:bg-[#F8FAFC] transition-all shadow-xs flex flex-col justify-between h-28 border ${activePreset === 'RANKING' ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 bg-[#EFF6FF]/40' : 'border-[#E2E8F0]'
                }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="material-symbols-outlined text-[18px] text-[#0D9488]">
                  stacked_bar_chart
                </span>
                <span className="font-label-sm text-label-sm text-[#64748B]">RANKING</span>
              </div>
              <div>
                <div className="font-label-md text-label-md text-[#0F172A] font-medium truncate">Top 10 products by profit</div>
                <div className="font-label-sm text-label-sm text-[#64748B] truncate">Horizontal ranking chart</div>
              </div>
            </button>

            {/* Preset 5 */}
            <button
              onClick={() => handlePresetClick('Compare Net Revenue and Gross Margin percentage across EMEA, NA, APAC, and LATAM regions', 'GEO DUAL')}
              className={`preset-card group text-left p-3.5 rounded-xl bg-white hover:bg-[#F8FAFC] transition-all shadow-xs flex flex-col justify-between h-28 border ${activePreset === 'GEO DUAL' ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 bg-[#EFF6FF]/40' : 'border-[#E2E8F0]'
                }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="material-symbols-outlined text-[18px] text-[#0891B2]">
                  public
                </span>
                <span className="font-label-sm text-label-sm text-[#64748B]">GEO DUAL</span>
              </div>
              <div>
                <div className="font-label-md text-label-md text-[#0F172A] font-medium truncate">Revenue & margin by region</div>
                <div className="font-label-sm text-label-sm text-[#64748B] truncate">Regional comparisons</div>
              </div>
            </button>

            {/* Preset 6 */}
            <button
              onClick={() => handlePresetClick('Scatter plot showing DiscountPercent on X axis versus GrossMarginPercent on Y axis with linear regression fit', 'REGRESS')}
              className={`preset-card group text-left p-3.5 rounded-xl bg-white hover:bg-[#F8FAFC] transition-all shadow-xs flex flex-col justify-between h-28 border ${activePreset === 'REGRESS' ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 bg-[#EFF6FF]/40' : 'border-[#E2E8F0]'
                }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="material-symbols-outlined text-[18px] text-[#D97706]">
                  scatter_plot
                </span>
                <span className="font-label-sm text-label-sm text-[#64748B]">REGRESS</span>
              </div>
              <div>
                <div className="font-label-md text-label-md text-[#0F172A] font-medium truncate">Discount vs Margin</div>
                <div className="font-label-sm text-label-sm text-[#64748B] truncate">Scatter with trend fit</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Generated Graph Result Canvas */}
      <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm mb-space-xl border border-[#E2E8F0]">
        {/* While isGenerating: Show Backend Execution Steps */}
        {isGenerating && <GraphStudioSkeleton />}

        {/* When generatedImage is available: Show Live Generated Visualization */}
        {!isGenerating && generatedImage && (
          <div>
            {/* Execution Meta & Canvas Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-[#E2E8F0]">
              <div className="flex items-center flex-wrap gap-2.5">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] font-label-sm text-label-sm font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
                  <span>Generated & Validated</span>
                </div>
                <span className="font-label-sm text-label-sm text-[#CBD5E1]">•</span>
                <span className="font-label-sm text-label-sm text-[#475569]">
                  {recordsMatched !== null ? `${recordsMatched.toLocaleString()} records matched` : 'HANA In-Memory Calculation'}
                </span>
                <span className="font-label-sm text-label-sm text-[#CBD5E1]">•</span>
                <span className="font-label-sm text-label-sm text-[#475569]">
                  Chart Type: {generatedChartType ?? chartType.replace('Auto-detect chart type', 'Auto')}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setExpandedViewOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] font-label-md text-label-md transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px]">fullscreen</span>
                  <span>Expand High-Res</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] font-label-md text-label-md transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Download Image</span>
                </button>
                <button
                  onClick={copyPythonCode}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE] font-label-md text-label-md transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#2563EB]">code</span>
                  <span>Copy Python Code</span>
                </button>
              </div>
            </div>

            {/* Rendered Chart Area — Clicking expands high-res modal with actual image */}
            <div className="w-full overflow-x-auto scroll-touch">
              <div
                onClick={() => setExpandedViewOpen(true)}
                className="min-w-[760px] py-4 flex flex-col items-center justify-center cursor-pointer group"
                title="Click to expand high-resolution visualization"
              >
                <div className="relative inline-block max-w-full">
                  <img
                    src={generatedImage}
                    alt="Generated visualization"
                    className="max-w-full h-auto rounded-xl shadow-sm border border-[#E2E8F0] group-hover:ring-4 group-hover:ring-violet-200 transition-all"
                  />
                  <div className="absolute bottom-3 right-3 bg-slate-900/85 text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
                    <span className="material-symbols-outlined text-[16px]">fullscreen</span>
                    <span>Click to expand high-res</span>
                  </div>
                </div>
              </div>

              {backendInsights && (
                <div className="mt-6 p-5 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE]">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#7C3AED] text-[20px] mt-0.5">insights</span>
                    <div>
                      <span className="font-label-md text-label-md font-semibold text-[#6D28D9]">AI Executive Insights</span>
                      <p className="font-body-sm text-body-sm text-[#5B21B6] mt-1 whitespace-pre-line leading-relaxed">{backendInsights}</p>
                    </div>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="mt-4 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[#DC2626] text-[18px] mt-0.5">error</span>
                    <p className="font-body-sm text-body-sm text-[#991B1B]">{errorMessage}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* When no graph generated yet and not generating: Clean empty state, mock graph removed */}
        {!isGenerating && !generatedImage && (
          <div className="w-full py-16 px-6 bg-slate-50/60 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-[#7C3AED] mb-4 shadow-2xs">
              <span className="material-symbols-outlined text-[32px]">query_stats</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold mb-1">
              No Graph Generated Yet
            </h3>
            <p className="font-body-sm text-body-sm text-[#64748B] max-w-lg mb-6">
              Enter a custom business question or select an instant graph blueprint above, then click <strong className="text-[#7C3AED]">Generate Visualization</strong> to execute Python scripts against live SAP HANA data.
            </p>
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-label-md text-label-md shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              <span>Generate Visualization Now</span>
            </button>
          </div>
        )}
      </div>

      {/* Schema Quick Drawer & Visual Operational Metadata */}
      <div className="bg-[#F8FAFC] p-6 rounded-2xl mb-space-xl border border-[#E2E8F0]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold">
              Active Semantic Table View: SALES_FACT_ENTERPRISE
            </h4>
            <p className="font-label-md text-label-md text-[#475569]">
              39 operational dimensions and financial metrics loaded into working memory cache.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-label-sm text-[#64748B]">Click column to insert into query</span>
          </div>
        </div>

        {/* Schema Columns Pills Cluster */}
        <div className="flex flex-wrap gap-2">
          {SCHEMA_COLUMNS.slice(0, 12).map((col) => (
            <button
              key={col.name}
              onClick={() => handleAppendColumn(col.name)}
              className="schema-pill px-3 py-1.5 rounded-full bg-white hover:bg-[#F1F5F9] text-[#0F172A] font-label-md text-label-md flex items-center gap-1.5 shadow-2xs border border-[#CBD5E1] transition-all hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined text-[14px] text-[#2563EB]">
                {col.type === 'NUM' ? 'tag' : col.type === 'PCT' ? 'percent' : col.type === 'INT' ? 'numbers' : 'category'}
              </span>
              <span>{col.name}</span>
              <span className="text-[9px] uppercase tracking-wide text-[#64748B] font-semibold">
                {col.type}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Full Schema Modal */}
      {schemaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setSchemaModalOpen(false)}
          />
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[85vh] flex flex-col z-10 border border-[#CBD5E1]">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold">
                  Full Column Registry ({SCHEMA_COLUMNS.length} Columns)
                </h3>
                <p className="font-body-sm text-body-sm text-[#475569]">
                  Active schema mapping for SAP HANA Enterprise calculation view
                </p>
              </div>
              <button
                onClick={() => setSchemaModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-3">
              <input
                value={schemaFilter}
                onChange={(e) => setSchemaFilter(e.target.value)}
                className="w-full h-10 px-4 rounded-xl bg-[#F8FAFC] text-[#0F172A] placeholder:text-[#64748B] font-body-sm text-body-sm border border-[#E2E8F0] focus:outline-none focus:border-[#2563EB] focus:bg-white transition-colors"
                placeholder="Filter 39 schema columns..."
                type="text"
              />
            </div>

            <div className="overflow-y-auto flex-1 my-2 pr-1 space-y-2">
              {filteredSchema.map((col) => (
                <div
                  key={col.name}
                  onClick={() => {
                    handleAppendColumn(col.name);
                    setSchemaModalOpen(false);
                  }}
                  className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between hover:bg-[#F1F5F9] cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-label-md text-label-md text-[#0F172A] font-semibold flex items-center gap-2">
                      <span>{col.name}</span>
                      <span className="font-mono text-[10px] text-[#64748B]">({col.dataType})</span>
                    </div>
                    <div className="font-label-sm text-label-sm text-[#64748B] mt-0.5">
                      {col.description}
                    </div>
                  </div>
                  <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] font-medium shrink-0">
                    {col.category}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-between items-center">
              <span className="font-label-sm text-[#64748B]">Click any column to append to query</span>
              <button
                onClick={() => setSchemaModalOpen(false)}
                className="px-5 py-2 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-label-md text-label-md shadow-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setHistoryModalOpen(false)}
          />
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 max-h-[80vh] flex flex-col z-10 border border-[#CBD5E1]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#2563EB]">history</span>
                <h3 className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold">Graph Generation History</h3>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 my-3 space-y-2">
              {queryHistory.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setPrompt(item.query);
                    setHistoryModalOpen(false);
                    showToast('Loaded query from history');
                  }}
                  className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-label-sm text-[#64748B]">{item.timestamp}</span>
                    <span className="font-label-sm px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                      {item.type}
                    </span>
                  </div>
                  <div className="font-body-sm text-[#0F172A]">{item.query}</div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] flex justify-end">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-1.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Studio Config Modal */}
      {configModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setConfigModalOpen(false)}
          />
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10 border border-[#CBD5E1]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#2563EB]">tune</span>
                <h3 className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold">Studio Configuration</h3>
              </div>
              <button
                onClick={() => setConfigModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-4 text-body-sm">
              <div>
                <label className="font-label-sm uppercase text-[#64748B] block mb-1">HANA Connection Timeout</label>
                <input
                  type="text"
                  defaultValue="15,000 ms"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A]"
                />
              </div>
              <div>
                <label className="font-label-sm uppercase text-[#64748B] block mb-1">SQL Generation Temperature</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="0" max="1" step="0.1" defaultValue="0.0" className="flex-1 accent-[#2563EB]" />
                  <span className="font-mono text-xs text-[#0F172A]">0.0 (Strict)</span>
                </div>
              </div>
              <div>
                <label className="font-label-sm uppercase text-[#64748B] block mb-1">Vector Re-ranking Depth</label>
                <input
                  type="text"
                  defaultValue="Top 50 partitions"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2">
              <button
                onClick={() => setConfigModalOpen(false)}
                className="px-4 py-1.5 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfigModalOpen(false);
                  showToast('Config updated');
                }}
                className="px-5 py-1.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded High-Res View Modal */}
      {expandedViewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setExpandedViewOpen(false)}
          />
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full p-8 z-10 max-h-[90vh] overflow-y-auto border border-[#CBD5E1]">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] mb-4">
              <div>
                <h3 className="font-headline-lg text-headline-lg text-[#0F172A] font-semibold">
                  High-Resolution Analytical Render
                </h3>
                <p className="font-body-sm text-[#64748B]">
                  SAP HANA Analytical View • {generatedChartType || 'Custom Python Matplotlib Visualization'}
                </p>
              </div>
              <button
                onClick={() => setExpandedViewOpen(false)}
                className="w-9 h-9 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Large High-Res Render with actual generated image */}
            <div className="w-full py-4 flex items-center justify-center bg-slate-50/60 rounded-2xl border border-[#E2E8F0] p-4 min-h-[360px]">
              {generatedImage ? (
                <img
                  src={generatedImage}
                  alt="High-resolution generated visualization"
                  className="max-w-full h-auto rounded-xl shadow-lg border border-[#CBD5E1]"
                />
              ) : (
                <div className="text-center py-12 text-[#64748B]">
                  <span className="material-symbols-outlined text-[48px] text-slate-300 mb-2">image</span>
                  <p className="text-sm font-medium">No generated visualization available to display</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-[#E2E8F0]">
              <span className="font-label-sm text-[#64748B]">
                {recordsMatched !== null ? `Records matched: ${recordsMatched.toLocaleString()} · Verified HANA Column-Store` : 'Native High-Resolution Render'}
              </span>
              <button
                onClick={handleDownload}
                className="px-6 py-2 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-label-md text-label-md shadow-xs transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Download Generated Image</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
