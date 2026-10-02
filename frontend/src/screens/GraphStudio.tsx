import React, { useState, useEffect } from 'react';
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

const PRESETS = [
  { name: 'SPLINE', label: 'Monthly Revenue Trend', icon: 'show_chart', prompt: 'Show monthly Net Revenue and Gross Margin comparison across 2024 and 2025 as a dual-axis trendline with milestone annotations' },
  { name: 'GROUPED', label: 'Quarterly Cohorts', icon: 'bar_chart', prompt: 'Quarterly gross profit comparison across 2023, 2024, and 2025 by Product Line' },
  { name: 'DONUT', label: 'Revenue by Category', icon: 'donut_large', prompt: 'Revenue contribution by commercial category as a proportional donut chart with percent callouts' },
  { name: 'RANKING', label: 'Top 10 Products by Profit', icon: 'stacked_bar_chart', prompt: 'Top 10 products ranked by total gross margin USD in descending order' },
  { name: 'GEO DUAL', label: 'Regional Comparisons', icon: 'public', prompt: 'Compare Net Revenue and Gross Margin percentage across EMEA, NA, APAC, and LATAM regions' },
  { name: 'REGRESS', label: 'Discount vs Margin', icon: 'scatter_plot', prompt: 'Scatter plot showing DiscountPercent on X axis versus GrossMarginPercent on Y axis with linear regression fit' },
];

export interface AvailableSchemaItem {
  name: string;
  type: 'Numeric' | 'Categorical' | 'Temporal';
  description: string;
}

export const AVAILABLE_DATASET_SCHEMA: AvailableSchemaItem[] = [
  { name: 'NetRevenueUSD', type: 'Numeric', description: 'Total realized sales revenue in USD' },
  { name: 'GrossMarginUSD', type: 'Numeric', description: 'Total gross profit margin in USD' },
  { name: 'GrossMarginPercent', type: 'Numeric', description: 'Margin percentage (0-100%)' },
  { name: 'DiscountPercent', type: 'Numeric', description: 'Applied discount rate' },
  { name: 'Quantity', type: 'Numeric', description: 'Number of units sold' },
  { name: 'UnitCostUSD', type: 'Numeric', description: 'Manufacturing & logistics cost per unit' },
  { name: 'UnitPriceUSD', type: 'Numeric', description: 'Standard retail list price' },
  { name: 'Region', type: 'Categorical', description: 'North America, Europe, Asia-Pacific, Latin America' },
  { name: 'Country', type: 'Categorical', description: '15 global operating countries (e.g., US, Germany, UK)' },
  { name: 'Category', type: 'Categorical', description: 'Material Handling, Heavy Machinery, Robotics, Safety, Tools' },
  { name: 'Product', type: 'Categorical', description: 'Specific industrial catalog SKU item' },
  { name: 'SalesQuarter', type: 'Temporal', description: 'Fiscal quarter (e.g., 2024 Q1, 2025 Q4)' },
  { name: 'MonthLabel', type: 'Temporal', description: 'Monthly granularity (e.g., 2024 Jan, 2025 Dec)' },
  { name: 'DistributionChannel', type: 'Categorical', description: 'Direct Enterprise, Distributor, Online B2B' },
  { name: 'CustomerSegment', type: 'Categorical', description: 'Enterprise, Mid-Market, Tier 1 OEM' },
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              SAP HANA Column Store · Connected
            </span>
            <span className="text-slate-300 text-xs hidden md:inline">•</span>
            <span className="text-slate-500 text-xs hidden md:inline">Analytical View v4.2</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Custom Graph Studio
          </h1>
        </div>

        {/* Global Studio Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setSchemaModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors text-xs font-medium shadow-2xs"
            id="schemaModalTrigger"
          >
            <span className="material-symbols-outlined text-[16px] text-blue-600">table_chart</span>
            <span>Available Schema ({AVAILABLE_DATASET_SCHEMA.length})</span>
          </button>

          <button
            onClick={() => setHistoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors text-xs font-medium shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px] text-slate-600">history</span>
            <span>History</span>
          </button>

          <button
            onClick={() => setConfigModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors text-xs font-medium shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px] text-slate-600">tune</span>
            <span>Config</span>
          </button>
        </div>
      </div>

      {/* Unified Query & Controls Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 mb-5 space-y-3.5">
        {/* Input Area */}
        <div className="relative flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center text-[#7C3AED] shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
          </div>
          <div className="flex-1">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-transparent resize-none text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none leading-relaxed font-normal"
              id="promptInput"
              placeholder="Ask a question or describe the analytical chart you want to build (e.g., Monthly revenue & margin trend)..."
              rows={2}
            />
          </div>
        </div>

        {/* Control Bar: Parameters + Generate Action */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Chart Type Dropdown */}
            <div className="relative">
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="appearance-none flex items-center gap-1 pl-3 pr-7 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-medium cursor-pointer border border-slate-200 focus:outline-none focus:border-violet-500"
              >
                <option>Auto-detect chart type</option>
                <option>Dual-Axis Spline</option>
                <option>Grouped Cohort Bar</option>
                <option>Proportional Donut</option>
                <option>Horizontal Ranking</option>
                <option>Regional Geo Dual</option>
                <option>Scatter Regression</option>
              </select>
              <span className="material-symbols-outlined text-[14px] text-slate-400 absolute right-2 top-2 pointer-events-none">
                expand_more
              </span>
            </div>

            {/* Dimension Dropdown */}
            <div className="relative">
              <select
                value={dimension}
                onChange={(e) => setDimension(e.target.value)}
                className="appearance-none flex items-center gap-1 pl-3 pr-7 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-medium cursor-pointer border border-slate-200 focus:outline-none focus:border-violet-500"
              >
                <option value="MonthLabel">DIM: MonthLabel</option>
                <option value="Category">DIM: Category</option>
                <option value="Region">DIM: Region</option>
                <option value="Country">DIM: Country</option>
                <option value="Product">DIM: Product</option>
                <option value="SalesQuarter">DIM: SalesQuarter</option>
              </select>
              <span className="material-symbols-outlined text-[14px] text-slate-400 absolute right-2 top-2 pointer-events-none">
                expand_more
              </span>
            </div>

            {/* Metric Dropdown */}
            <div className="relative">
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="appearance-none flex items-center gap-1 pl-3 pr-7 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-medium cursor-pointer border border-slate-200 focus:outline-none focus:border-violet-500"
              >
                <option value="NetRevenueUSD">VAL: NetRevenueUSD</option>
                <option value="GrossMarginUSD">VAL: GrossMarginUSD</option>
                <option value="GrossMarginPercent">VAL: GrossMarginPercent</option>
                <option value="Quantity">VAL: Quantity</option>
                <option value="DiscountPercent">VAL: DiscountPercent</option>
              </select>
              <span className="material-symbols-outlined text-[14px] text-slate-400 absolute right-2 top-2 pointer-events-none">
                expand_more
              </span>
            </div>

            {/* Aggregation Pill */}
            <button
              onClick={() => setAggregation(prev => prev === 'SUM' ? 'AVG' : prev === 'AVG' ? 'COUNT' : 'SUM')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold hover:bg-blue-100 transition-colors"
              title="Click to cycle aggregation: SUM, AVG, COUNT"
            >
              <span>Σ {aggregation}</span>
            </button>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full sm:w-auto justify-center flex items-center gap-2 px-5 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all disabled:opacity-70"
            id="generateBtn"
          >
            {isGenerating ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                <span>Synthesizing…</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                <span>Generate Visualization</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Blueprints Horizontal Chips */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto scroll-touch pb-0.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-violet-600">auto_fix_high</span>
            Blueprints:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => handlePresetClick(p.prompt, p.name)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 border shadow-2xs shrink-0 ${activePreset === p.name
                  ? 'bg-violet-50 text-violet-700 border-violet-300 ring-2 ring-violet-100 font-semibold'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
              >
                <span className="material-symbols-outlined text-[14px] text-slate-500">{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Generated Graph Result Canvas */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-7 mb-5">
        {/* While isGenerating: Show Backend Execution Steps */}
        {isGenerating && <GraphStudioSkeleton />}

        {/* When generatedImage is available: Show Live Generated Visualization */}
        {!isGenerating && generatedImage && (
          <div>
            {/* Execution Meta & Canvas Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-200">
              <div className="flex items-center flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Validated HANA Query</span>
                </div>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 font-medium">
                  {recordsMatched !== null ? `${recordsMatched.toLocaleString()} records matched` : 'In-Memory Compute'}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 font-medium">
                  {generatedChartType ?? chartType.replace('Auto-detect chart type', 'Auto')}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setExpandedViewOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-medium transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[15px]">fullscreen</span>
                  <span>Expand High-Res</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-medium transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[15px]">download</span>
                  <span>Download Image</span>
                </button>
                <button
                  onClick={copyPythonCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-medium transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[15px] text-blue-600">code</span>
                  <span>Python Code</span>
                </button>
              </div>
            </div>

            {/* Rendered Chart Area — Clicking expands high-res modal with actual image */}
            <div className="w-full overflow-x-auto scroll-touch">
              <div
                onClick={() => setExpandedViewOpen(true)}
                className="min-w-[700px] py-2 flex flex-col items-center justify-center cursor-pointer group"
                title="Click to expand high-resolution visualization"
              >
                <div className="relative inline-block max-w-full">
                  <img
                    src={generatedImage}
                    alt="Generated visualization"
                    className="max-w-full h-auto rounded-xl shadow-sm border border-slate-200 group-hover:ring-4 group-hover:ring-violet-200 transition-all"
                  />
                  <div className="absolute bottom-3 right-3 bg-slate-900/85 text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
                    <span className="material-symbols-outlined text-[15px]">fullscreen</span>
                    <span>Click to expand</span>
                  </div>
                </div>
              </div>

              {backendInsights && (
                <div className="mt-5 p-4 sm:p-5 rounded-xl bg-violet-50/70 border border-violet-200/80">
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[#7C3AED] text-[18px] mt-0.5 shrink-0">insights</span>
                    <div>
                      <span className="text-xs font-bold text-violet-900 uppercase tracking-wider">AI Executive Insights</span>
                      <p className="text-xs sm:text-sm text-violet-950 mt-1 whitespace-pre-line leading-relaxed font-normal">{backendInsights}</p>
                    </div>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-red-600 text-[18px] mt-0.5">error</span>
                    <p className="text-xs text-red-800">{errorMessage}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* When no graph generated yet and not generating: Clean minimal empty state */}
        {!isGenerating && !generatedImage && (
          <div className="w-full py-12 px-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-[#7C3AED] mb-3 shadow-2xs">
              <span className="material-symbols-outlined text-[24px]">query_stats</span>
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">
              Ready to Visualize Enterprise KPI Data
            </h3>
            <p className="text-xs text-slate-500 max-w-md mb-4 leading-normal">
              Select an instant blueprint or enter your analytical question above, then click <strong>Generate Visualization</strong>.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => handlePresetClick(PRESETS[0].prompt, PRESETS[0].name)}
                className="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <span>📈</span>
                <span>Monthly Revenue Trend</span>
              </button>
              <button
                onClick={() => handlePresetClick(PRESETS[4].prompt, PRESETS[4].name)}
                className="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <span>🌍</span>
                <span>Regional Comparisons</span>
              </button>
              <button
                onClick={() => handlePresetClick(PRESETS[3].prompt, PRESETS[3].name)}
                className="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <span>🏆</span>
                <span>Top 10 Product Ranking</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Semantic Schema Drawer */}
      <details className="border border-slate-200 rounded-2xl bg-white p-5 transition-all group shadow-sm">
        <summary className="cursor-pointer flex items-center justify-between text-xs font-semibold text-slate-700 select-none list-none">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#2563EB]">table_chart</span>
            <span className="font-bold text-sm text-[#0F172A]">Available Dataset Schema</span>
            <span className="text-xs font-normal text-slate-400">({AVAILABLE_DATASET_SCHEMA.length} columns)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 group-open:hidden">Click to expand</span>
            <span className="material-symbols-outlined text-[16px] text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
          </div>
        </summary>
        <div className="pt-3 mt-3 border-t border-slate-100">
          <p className="text-xs text-[#64748B] mb-3">Click any column to include it in your query:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AVAILABLE_DATASET_SCHEMA.map((col) => (
              <div
                key={col.name}
                onClick={() => handleAppendColumn(col.name)}
                className="bg-white border border-[#E2E8F0] hover:border-[#2563EB] hover:shadow-xs rounded-xl p-3 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-[13px] text-[#0F172A] group-hover:text-[#2563EB] transition-colors">{col.name}</span>
                  <span className="text-[11px] font-medium text-[#475569] bg-[#F1F5F9] px-2 py-0.5 rounded">{col.type}</span>
                </div>
                <p className="text-[11px] text-[#64748B] leading-snug">{col.description}</p>
              </div>
            ))}
          </div>
        </div>
      </details>

      {/* Available Dataset Schema Modal matching image */}
      {schemaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setSchemaModalOpen(false)}
          />
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] flex flex-col z-10 border border-[#CBD5E1]">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#2563EB] text-[22px]">table_chart</span>
                <h3 className="font-bold text-[17px] text-[#0F172A]">
                  Available Dataset Schema
                </h3>
              </div>
              <button
                onClick={() => setSchemaModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-[#F1F5F9] flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                title="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-xs text-[#64748B] mb-4">
              Click any column to include it in your query:
            </p>

            <div className="overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AVAILABLE_DATASET_SCHEMA.map((col) => (
                  <div
                    key={col.name}
                    onClick={() => {
                      handleAppendColumn(col.name);
                      setSchemaModalOpen(false);
                    }}
                    className="bg-white border border-[#E2E8F0] hover:border-[#2563EB] hover:shadow-xs rounded-xl p-3 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-[13px] text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
                        {col.name}
                      </span>
                      <span className="text-[11px] font-medium text-[#475569] bg-[#F1F5F9] px-2 py-0.5 rounded">
                        {col.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] leading-snug">
                      {col.description}
                    </p>
                  </div>
                ))}
              </div>
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
