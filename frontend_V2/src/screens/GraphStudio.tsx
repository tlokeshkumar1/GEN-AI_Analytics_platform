import React, { useState } from 'react';
import { SCHEMA_COLUMNS } from '../data/mockData';
import { generateCustomGraph, GraphResponse } from '../services/graphService';

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
      const res = await generateCustomGraph(prompt);
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
      const res = await generateCustomGraph(presetPrompt);
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

  const downloadSVG = () => {
    const svgElement = document.getElementById('studio-svg-chart');
    if (!svgElement) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgElement);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HANA_Custom_Graph_${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Graph downloaded as SVG');
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
              className={`preset-card group text-left p-3.5 rounded-xl bg-white hover:bg-[#F8FAFC] transition-all shadow-xs flex flex-col justify-between h-28 border ${
                activePreset === 'SPLINE' ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 bg-[#EFF6FF]/40' : 'border-[#E2E8F0]'
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
              className={`preset-card group text-left p-3.5 rounded-xl bg-white hover:bg-[#F8FAFC] transition-all shadow-xs flex flex-col justify-between h-28 border ${
                activePreset === 'GROUPED' ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 bg-[#EFF6FF]/40' : 'border-[#E2E8F0]'
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
              className={`preset-card group text-left p-3.5 rounded-xl bg-white hover:bg-[#F8FAFC] transition-all shadow-xs flex flex-col justify-between h-28 border ${
                activePreset === 'DONUT' ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 bg-[#EFF6FF]/40' : 'border-[#E2E8F0]'
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
              className={`preset-card group text-left p-3.5 rounded-xl bg-white hover:bg-[#F8FAFC] transition-all shadow-xs flex flex-col justify-between h-28 border ${
                activePreset === 'RANKING' ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 bg-[#EFF6FF]/40' : 'border-[#E2E8F0]'
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
              className={`preset-card group text-left p-3.5 rounded-xl bg-white hover:bg-[#F8FAFC] transition-all shadow-xs flex flex-col justify-between h-28 border ${
                activePreset === 'GEO DUAL' ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 bg-[#EFF6FF]/40' : 'border-[#E2E8F0]'
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
              className={`preset-card group text-left p-3.5 rounded-xl bg-white hover:bg-[#F8FAFC] transition-all shadow-xs flex flex-col justify-between h-28 border ${
                activePreset === 'REGRESS' ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 bg-[#EFF6FF]/40' : 'border-[#E2E8F0]'
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
        {/* Execution Meta & Canvas Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-[#E2E8F0]">
          <div className="flex items-center flex-wrap gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] font-label-sm text-label-sm font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
              <span>Executed in 312ms</span>
            </div>
            <span className="font-label-sm text-label-sm text-[#CBD5E1]">•</span>
            <span className="font-label-sm text-label-sm text-[#475569]">{recordsMatched !== null ? `${recordsMatched.toLocaleString()} records matched` : '3,420 records matched'}</span>
            <span className="font-label-sm text-label-sm text-[#CBD5E1]">•</span>
            <span className="font-label-sm text-label-sm text-[#475569]">
              Chart Type: {generatedChartType ?? 'Dual-Axis Spline Trendline'}
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
              onClick={downloadSVG}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] font-label-md text-label-md transition-colors shadow-2xs"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Download PNG / SVG</span>
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

        {/* Chart Legend & KPI Highlights */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 px-2">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-1.5 rounded-full bg-[#2563EB]"></span>
              <span className="font-label-md text-label-md text-[#0F172A] font-semibold">
                Net Revenue ($M) · Primary Axis
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-1.5 rounded-full bg-[#0D9488]"></span>
              <span className="font-label-md text-label-md text-[#0D9488] font-semibold">
                Gross Margin % · Secondary Axis
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-label-sm text-label-sm text-[#64748B]">CURRENT RUN-RATE</div>
              <div className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold">
                $48.2M <span className="font-label-sm text-label-sm text-[#16A34A] font-normal">(+14.2% YoY)</span>
              </div>
            </div>
            <div className="text-right pl-4 border-l border-[#E2E8F0]">
              <div className="font-label-sm text-label-sm text-[#64748B]">AVG GROSS MARGIN</div>
              <div className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold">
                41.8% <span className="font-label-sm text-label-sm text-[#16A34A] font-normal">(+280 bps)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Swipe Hint */}
        <div className="flex sm:hidden items-center gap-1.5 text-[#64748B] text-[11px] mb-2 px-1">
          <span className="material-symbols-outlined text-[14px]">swipe</span>
          <span>Swipe horizontally to view full multi-month timeline</span>
        </div>

        {/* Rendered Chart Area — Shows backend image or fallback SVG */}
        {generatedImage ? (
          <div className="w-full overflow-x-auto scroll-touch">
            <div className="min-w-[760px] py-4 flex items-center justify-center">
              <img 
                src={generatedImage} 
                alt="Generated visualization" 
                className="max-w-full h-auto rounded-xl shadow-sm border border-[#E2E8F0]"
              />
            </div>
            {backendInsights && (
              <div className="mt-4 p-4 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE]">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#7C3AED] text-[18px] mt-0.5">insights</span>
                  <div>
                    <span className="font-label-md text-label-md font-semibold text-[#6D28D9]">AI Executive Insights</span>
                    <p className="font-body-sm text-body-sm text-[#5B21B6] mt-1 whitespace-pre-line">{backendInsights}</p>
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
        ) : (
        <div className="w-full overflow-x-auto scroll-touch">
          <div className="min-w-[760px] py-4">
            <svg 
              id="studio-svg-chart"
              className="w-full h-auto text-on-surface select-none" 
              viewBox="0 0 1000 380" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="studioRevGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.20"></stop>
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.01"></stop>
                </linearGradient>
                <linearGradient id="studioMarginGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#0D9488" stopOpacity="0.18"></stop>
                  <stop offset="100%" stopColor="#0D9488" stopOpacity="0.01"></stop>
                </linearGradient>
              </defs>

              {/* Background Subtle Horizontal Gridlines */}
              <line stroke="#E2E8F0" strokeDasharray="4 4" x1="60" x2="940" y1="40" y2="40" />
              <line stroke="#E2E8F0" strokeDasharray="4 4" x1="60" x2="940" y1="105" y2="105" />
              <line stroke="#E2E8F0" strokeDasharray="4 4" x1="60" x2="940" y1="170" y2="170" />
              <line stroke="#E2E8F0" strokeDasharray="4 4" x1="60" x2="940" y1="235" y2="235" />
              <line stroke="#CBD5E1" x1="60" x2="940" y1="300" y2="300" />

              {/* Y1 Axis Labels (Left: Net Revenue $M) */}
              <text className="text-[11px] font-label-md fill-[#64748B]" textAnchor="end" x="50" y="44">$60M</text>
              <text className="text-[11px] font-label-md fill-[#64748B]" textAnchor="end" x="50" y="109">$45M</text>
              <text className="text-[11px] font-label-md fill-[#64748B]" textAnchor="end" x="50" y="174">$30M</text>
              <text className="text-[11px] font-label-md fill-[#64748B]" textAnchor="end" x="50" y="239">$15M</text>
              <text className="text-[11px] font-label-md fill-[#64748B]" textAnchor="end" x="50" y="304">$0M</text>

              {/* Y2 Axis Labels (Right: Gross Margin %) */}
              <text className="text-[11px] font-label-md fill-[#0D9488]" textAnchor="start" x="950" y="44">60%</text>
              <text className="text-[11px] font-label-md fill-[#0D9488]" textAnchor="start" x="950" y="109">45%</text>
              <text className="text-[11px] font-label-md fill-[#0D9488]" textAnchor="start" x="950" y="174">30%</text>
              <text className="text-[11px] font-label-md fill-[#0D9488]" textAnchor="start" x="950" y="239">15%</text>
              <text className="text-[11px] font-label-md fill-[#0D9488]" textAnchor="start" x="950" y="304">0%</text>

              {/* Area Fills under curves */}
              <path 
                d="M 80 230 C 150 220, 220 200, 290 190 C 360 180, 430 160, 500 135 C 570 110, 640 120, 710 95 C 780 70, 850 80, 920 60 L 920 300 L 80 300 Z" 
                fill="url(#studioRevGrad)" 
              />
              <path 
                d="M 80 200 C 150 195, 220 185, 290 175 C 360 165, 430 150, 500 145 C 570 140, 640 130, 710 120 C 780 110, 850 100, 920 85 L 920 300 L 80 300 Z" 
                fill="url(#studioMarginGrad)" 
              />

              {/* Milestone / Strategic Point Highlight (Q3 2024 Inflection) */}
              <line opacity="0.6" stroke="#64748B" strokeDasharray="3 3" x1="500" x2="500" y1="40" y2="300" />
              <rect fill="#EFF6FF" height="22" rx="4" width="130" x="435" y="12" stroke="#BFDBFE" />
              <text className="text-[10px] font-label-sm font-semibold fill-[#1D4ED8]" textAnchor="middle" x="500" y="27">
                Q3 2024 S/4HANA Go-Live
              </text>

              {/* Primary Spline: Net Revenue ($M) */}
              <path 
                d="M 80 230 C 150 220, 220 200, 290 190 C 360 180, 430 160, 500 135 C 570 110, 640 120, 710 95 C 780 70, 850 80, 920 60" 
                fill="none" 
                stroke="#2563EB" 
                strokeWidth="2.5" 
              />

              {/* Secondary Spline: Gross Margin % */}
              <path 
                d="M 80 200 C 150 195, 220 185, 290 175 C 360 165, 430 150, 500 145 C 570 140, 640 130, 710 120 C 780 110, 850 100, 920 85" 
                fill="none" 
                stroke="#0D9488" 
                strokeDasharray="6 3" 
                strokeWidth="2" 
              />

              {/* Points for Net Revenue Line */}
              <circle cx="80" cy="230" fill="#FFFFFF" r="4" stroke="#2563EB" strokeWidth="2" />
              <circle cx="220" cy="200" fill="#FFFFFF" r="4" stroke="#2563EB" strokeWidth="2" />
              <circle cx="360" cy="180" fill="#FFFFFF" r="4" stroke="#2563EB" strokeWidth="2" />
              <circle cx="500" cy="135" fill="#2563EB" r="5" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="640" cy="120" fill="#FFFFFF" r="4" stroke="#2563EB" strokeWidth="2" />
              <circle cx="780" cy="70" fill="#FFFFFF" r="4" stroke="#2563EB" strokeWidth="2" />
              <circle cx="920" cy="60" fill="#2563EB" r="5" stroke="#FFFFFF" strokeWidth="2" />

              {/* Points for Gross Margin Line */}
              <circle cx="80" cy="200" fill="#0D9488" r="3.5" />
              <circle cx="220" cy="185" fill="#0D9488" r="3.5" />
              <circle cx="360" cy="165" fill="#0D9488" r="3.5" />
              <circle cx="500" cy="145" fill="#0D9488" r="4.5" stroke="#FFFFFF" strokeWidth="1.5" />
              <circle cx="640" cy="130" fill="#0D9488" r="3.5" />
              <circle cx="780" cy="110" fill="#0D9488" r="3.5" />
              <circle cx="920" cy="85" fill="#0D9488" r="4.5" stroke="#FFFFFF" strokeWidth="1.5" />

              {/* Tooltip Simulation on Q3 2024 Point */}
              <g transform="translate(510, 100)">
                <rect fill="#0F172A" height="48" opacity="0.95" rx="6" width="145" />
                <text className="text-[10px] font-label-sm" fill="#FFFFFF" x="10" y="18">Aug 2024 • $38.4M</text>
                <text className="text-[10px] font-label-sm font-semibold" fill="#93C5FD" x="10" y="36">Margin: 42.1% (↑ 340bps)</text>
              </g>

              {/* X-Axis Labels (Time Dimension) */}
              <text className="text-[11px] font-label-md fill-[#64748B]" textAnchor="middle" x="80" y="325">Jan 24</text>
              <text className="text-[11px] font-label-md fill-[#64748B]" textAnchor="middle" x="150" y="325">Mar 24</text>
              <text className="text-[11px] font-label-md fill-[#64748B]" textAnchor="middle" x="220" y="325">May 24</text>
              <text className="text-[11px] font-label-md fill-[#64748B]" textAnchor="middle" x="290" y="325">Jul 24</text>
              <text className="text-[11px] font-label-md fill-[#64748B]" textAnchor="middle" x="360" y="325">Sep 24</text>
              <text className="text-[11px] font-label-md fill-[#64748B]" textAnchor="middle" x="430" y="325">Nov 24</text>
              <text className="text-[11px] font-label-md fill-[#0F172A] font-semibold" textAnchor="middle" x="500" y="325">Jan 25</text>
              <text className="text-[11px] font-label-md fill-[#64748B]" textAnchor="middle" x="570" y="325">Mar 25</text>
              <text className="text-[11px] font-label-md fill-[#64748B]" textAnchor="middle" x="640" y="325">May 25</text>
              <text className="text-[11px] font-label-md fill-[#64748B]" textAnchor="middle" x="710" y="325">Jul 25</text>
              <text className="text-[11px] font-label-md fill-[#64748B]" textAnchor="middle" x="780" y="325">Sep 25</text>
              <text className="text-[11px] font-label-md fill-[#64748B]" textAnchor="middle" x="850" y="325">Nov 25</text>
              <text className="text-[11px] font-label-md fill-[#0F172A] font-semibold" textAnchor="middle" x="920" y="325">Dec 25 (Proj)</text>
            </svg>
          </div>
        </div>
        )}

        {/* AI Summary & Key Insights Panel */}
        <div className="mt-8 pt-6 border-t border-[#E2E8F0]">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[18px] text-[#7C3AED]">insights</span>
            <h3 className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold">
              Synthesized Executive Insights
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-[#F5F3FF] font-label-sm text-label-sm text-[#6D28D9] border border-[#DDD6FE]">
              Validated against HANA In-Memory Stats
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Insight Card 1 */}
            <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#64748B] font-semibold">
                  Structural Pivot
                </span>
                <span className="material-symbols-outlined text-[16px] text-[#2563EB]">trending_up</span>
              </div>
              <div className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold mb-1">
                Q3 2024 Inflection Point
              </div>
              <p className="font-body-sm text-body-sm text-[#475569]">
                Net revenue trajectory accelerated from an average $24.8M monthly baseline to $38.4M following unified enterprise discounting controls in SAP BTP.
              </p>
            </div>

            {/* Insight Card 2 */}
            <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#64748B] font-semibold">
                  Category Resilience
                </span>
                <span className="material-symbols-outlined text-[16px] text-[#0D9488]">shield</span>
              </div>
              <div className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold mb-1">
                Margin Resilience in Machinery
              </div>
              <p className="font-body-sm text-body-sm text-[#475569]">
                Heavy Machinery gross margin expanded by 340 bps even as volume scaled, confirming pricing power resilience against supply chain volatility.
              </p>
            </div>

            {/* Insight Card 3 */}
            <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#64748B] font-semibold">
                  Predictive Forecast
                </span>
                <span className="material-symbols-outlined text-[16px] text-[#7C3AED]">psychology</span>
              </div>
              <div className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold mb-1">
                Projected Q4 Trajectory
              </div>
              <p className="font-body-sm text-body-sm text-[#475569]">
                Autoregressive vector estimation projects fiscal year-end net run-rate reaching $54.2M, with margin stabilized in the 43.5% ± 0.8% corridor.
              </p>
            </div>
          </div>
        </div>
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
                  SAP HANA Analytical View • Dual-Axis Spline Trendline
                </p>
              </div>
              <button 
                onClick={() => setExpandedViewOpen(false)}
                className="w-9 h-9 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Large SVG */}
            <div className="w-full py-4">
              <svg 
                className="w-full h-auto text-on-surface" 
                viewBox="0 0 1000 380" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <line stroke="#E2E8F0" strokeDasharray="4 4" x1="60" x2="940" y1="40" y2="40" />
                <line stroke="#E2E8F0" strokeDasharray="4 4" x1="60" x2="940" y1="105" y2="105" />
                <line stroke="#E2E8F0" strokeDasharray="4 4" x1="60" x2="940" y1="170" y2="170" />
                <line stroke="#E2E8F0" strokeDasharray="4 4" x1="60" x2="940" y1="235" y2="235" />
                <line stroke="#CBD5E1" x1="60" x2="940" y1="300" y2="300" />
                
                <path d="M 80 230 C 150 220, 220 200, 290 190 C 360 180, 430 160, 500 135 C 570 110, 640 120, 710 95 C 780 70, 850 80, 920 60 L 920 300 L 80 300 Z" fill="#2563EB" fillOpacity="0.12" />
                <path d="M 80 200 C 150 195, 220 185, 290 175 C 360 165, 430 150, 500 145 C 570 140, 640 130, 710 120 C 780 110, 850 100, 920 85 L 920 300 L 80 300 Z" fill="#0D9488" fillOpacity="0.12" />
                
                <path d="M 80 230 C 150 220, 220 200, 290 190 C 360 180, 430 160, 500 135 C 570 110, 640 120, 710 95 C 780 70, 850 80, 920 60" fill="none" stroke="#2563EB" strokeWidth="3" />
                <path d="M 80 200 C 150 195, 220 185, 290 175 C 360 165, 430 150, 500 145 C 570 140, 640 130, 710 120 C 780 110, 850 100, 920 85" fill="none" stroke="#0D9488" strokeDasharray="6 3" strokeWidth="2.5" />
              </svg>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-[#E2E8F0]">
              <span className="font-label-sm text-[#64748B]">Resolution: 3000 x 1140 Native Vector</span>
              <button 
                onClick={downloadSVG}
                className="px-6 py-2 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-label-md text-label-md"
              >
                Download Vector File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
