import React, { useState, useRef, useCallback } from 'react';
import {
  Sparkles,
  BarChart2,
  Send,
  Download,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  PieChart,
  Activity,
  LayoutGrid,
  Loader2,
  X,
  RefreshCw,
  History,
  Copy,
  Check,
  Maximize2,
  TableProperties,
} from 'lucide-react';
import { generateCustomGraph } from '../../services/graph';
import type { GraphResponse } from '../../services/graph';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  id: string;
  prompt: string;
  result: GraphResponse;
  timestamp: Date;
}

// ── Categorized Suggestions ───────────────────────────────────────────────────

const SUGGESTION_CATEGORIES = [
  {
    category: 'Trends & Time Series',
    items: [
      { label: 'Monthly revenue trend', icon: TrendingUp, prompt: 'Show monthly net revenue trend over time as a line chart with smooth shaded area' },
      { label: 'Quarterly profit comparison', icon: BarChart2, prompt: 'Compare quarterly gross profit across 2023, 2024, and 2025 as a grouped bar chart' },
    ],
  },
  {
    category: 'Category & Products',
    items: [
      { label: 'Revenue by category (Donut)', icon: PieChart, prompt: 'Create a donut chart of total net revenue by product category with percentage callouts' },
      { label: 'Top 10 products by profit', icon: LayoutGrid, prompt: 'Horizontal bar chart of top 10 products ranked by total GrossMarginUSD' },
    ],
  },
  {
    category: 'Regional & Geographic',
    items: [
      { label: 'Revenue & margin by region', icon: Activity, prompt: 'Compare Net Revenue and Gross Margin across North America, Europe, Asia-Pacific, and Latin America' },
      { label: 'Top countries market share', icon: PieChart, prompt: 'Show top 8 countries by sales revenue as a pie chart' },
    ],
  },
  {
    category: 'Statistical & Distribution',
    items: [
      { label: 'Discount vs Margin (Scatter)', icon: Activity, prompt: 'Scatter plot of DiscountPercent vs GrossMarginPercent with a regression trendline' },
      { label: 'Cost & revenue funnel', icon: Sparkles, prompt: 'Create a funnel chart or stacked bar chart of Net Revenue vs Total Cost by category' },
    ],
  },
];

// ── Available Dataset Columns Reference ───────────────────────────────────────

const DATASET_COLUMNS = [
  { name: 'NetRevenueUSD', type: 'Numeric', desc: 'Total realized sales revenue in USD' },
  { name: 'GrossMarginUSD', type: 'Numeric', desc: 'Total gross profit margin in USD' },
  { name: 'GrossMarginPercent', type: 'Numeric', desc: 'Margin percentage (0-100%)' },
  { name: 'DiscountPercent', type: 'Numeric', desc: 'Applied discount rate' },
  { name: 'Quantity', type: 'Numeric', desc: 'Number of units sold' },
  { name: 'UnitCostUSD', type: 'Numeric', desc: 'Manufacturing & logistics cost per unit' },
  { name: 'UnitPriceUSD', type: 'Numeric', desc: 'Standard retail list price' },
  { name: 'Region', type: 'Categorical', desc: 'North America, Europe, Asia-Pacific, Latin America' },
  { name: 'Country', type: 'Categorical', desc: '15 global operating countries (e.g., US, Germany, UK)' },
  { name: 'Category', type: 'Categorical', desc: 'Material Handling, Heavy Machinery, Robotics, Safety, Tools' },
  { name: 'Product', type: 'Categorical', desc: 'Specific industrial catalog SKU item' },
  { name: 'SalesQuarter', type: 'Temporal', desc: 'Fiscal quarter (e.g., 2024 Q1, 2025 Q4)' },
  { name: 'MonthLabel', type: 'Temporal', desc: 'Monthly granularity (e.g., 2024 Jan, 2025 Dec)' },
  { name: 'DistributionChannel', type: 'Categorical', desc: 'Direct Enterprise, Distributor, Online B2B' },
  { name: 'CustomerSegment', type: 'Categorical', desc: 'Enterprise, Mid-Market, Tier 1 OEM' },
];

// ── Chart-type badge colours ──────────────────────────────────────────────────

const CHART_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  bar:          { bg: 'bg-sky-100',    text: 'text-sky-700',    label: 'Bar Chart'          },
  stacked_bar:  { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Stacked Bar'        },
  line:         { bg: 'bg-emerald-100',text: 'text-emerald-700',label: 'Line Chart'         },
  area:         { bg: 'bg-teal-100',   text: 'text-teal-700',   label: 'Area Chart'         },
  pie:          { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Pie Chart'          },
  donut:        { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Donut Chart'        },
  scatter:      { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Scatter Plot'       },
  heatmap:      { bg: 'bg-rose-100',   text: 'text-rose-700',   label: 'Heatmap'            },
  funnel:       { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Funnel Chart'       },
  waterfall:    { bg: 'bg-cyan-100',   text: 'text-cyan-700',   label: 'Waterfall Chart'    },
  treemap:      { bg: 'bg-lime-100',   text: 'text-lime-700',   label: 'Treemap'            },
  box:          { bg: 'bg-pink-100',   text: 'text-pink-700',   label: 'Box Plot'           },
  violin:       { bg: 'bg-fuchsia-100',text: 'text-fuchsia-700',label: 'Violin Plot'        },
  dynamic:      { bg: 'bg-slate-100',  text: 'text-slate-700',  label: 'AI Visual'          },
};

function getChartBadge(type?: string) {
  return CHART_BADGE[type ?? ''] ?? CHART_BADGE['dynamic'];
}

// ── Pipeline steps ────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  'Inspecting Excel dataset schema & columns…',
  'Interpreting natural language query with LLM…',
  'Synthesizing Python Matplotlib / Seaborn visualization script…',
  'Executing in isolated local Python environment…',
  'Generating high-resolution chart & extracting AI insights…',
];

const GraphSkeleton: React.FC = () => {
  const [stepIdx, setStepIdx] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx((prev) => Math.min(prev + 1, PIPELINE_STEPS.length - 1));
    }, 850);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel p-6 animate-pulse-soft space-y-5 border border-sky-200/80 bg-white/95">
      <div className="w-full h-80 bg-gradient-to-br from-slate-100 via-sky-50/50 to-slate-200 rounded-2xl flex items-center justify-center border border-slate-200/60">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-sky-600" />
            <Sparkles className="w-5 h-5 text-indigo-500 absolute -top-1 -right-1 animate-bounce" />
          </div>
          <span className="text-sm font-semibold text-slate-700">Synthesizing Custom Graph…</span>
          <span className="text-xs text-slate-400">Running Python AI Agent Sandbox</span>
        </div>
      </div>

      <div className="space-y-2.5 max-w-lg mx-auto">
        {PIPELINE_STEPS.map((step, i) => (
          <div
            key={step}
            className={`flex items-center gap-3 text-xs transition-all duration-300 ${
              i < stepIdx
                ? 'text-emerald-700 font-medium'
                : i === stepIdx
                ? 'text-sky-700 font-bold'
                : 'text-slate-400'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                i < stepIdx
                  ? 'bg-emerald-100 text-emerald-700'
                  : i === stepIdx
                  ? 'bg-sky-500 text-white animate-pulse shadow-xs'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {i < stepIdx ? '✓' : i + 1}
            </div>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const CustomGraphPage: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GraphResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = useCallback(
    async (customPrompt?: string) => {
      const finalPrompt = (customPrompt ?? prompt).trim();
      if (!finalPrompt) return;

      setLoading(true);
      setError(null);
      setResult(null);
      if (customPrompt) setPrompt(customPrompt);

      try {
        const res = await generateCustomGraph(finalPrompt);
        setResult(res);
        setHistory((prev) => [
          {
            id: Date.now().toString(),
            prompt: finalPrompt,
            result: res,
            timestamp: new Date(),
          },
          ...prev.slice(0, 19),
        ]);
      } catch (err: any) {
        setError(
          err?.response?.data?.detail ??
            err?.message ??
            'Failed to generate custom graph. Please refine your query.'
        );
      } finally {
        setLoading(false);
      }
    },
    [prompt]
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerate();
  };

  const handleDownload = () => {
    if (!result?.image_base64) return;
    const a = document.createElement('a');
    a.href = result.image_base64;
    a.download = `enterprise_graph_${Date.now()}.png`;
    a.click();
  };

  const copyPromptText = () => {
    if (!result?.prompt) return;
    navigator.clipboard.writeText(result.prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const restoreFromHistory = (entry: HistoryEntry) => {
    setResult(entry.result);
    setPrompt(entry.prompt);
    setError(null);
    setShowHistory(false);
  };

  const badge = getChartBadge(result?.chart_type);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 bg-gradient-to-r from-white via-sky-50/50 to-indigo-50/40 border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-2xl shadow-md shadow-sky-600/20 text-white flex-shrink-0">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 uppercase tracking-wider">
                  Python Agent Sandbox
                </span>
                <span className="text-[11px] text-slate-400">Matplotlib & Seaborn Engine</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                Custom Graph Generation Studio
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Describe any chart in plain English. The AI agent inspects your data, executes a custom visualization script, and renders high-res plots instantly.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSchemaModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-all"
            >
              <TableProperties className="w-4 h-4 text-sky-600" />
              <span>Dataset Columns</span>
            </button>

            {history.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-all"
              >
                <History className="w-4 h-4 text-indigo-600" />
                <span>History ({history.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: History Drawer + Studio Content */}
      <div className="flex gap-6 items-start">
        {/* History Sidebar */}
        {showHistory && (
          <aside className="w-72 glass-panel p-4 flex-shrink-0 space-y-3 animate-in fade-in duration-200 border border-slate-200 bg-white">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <History className="w-4 h-4 text-sky-600" />
                <span>Recent Generations</span>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => restoreFromHistory(entry)}
                  className="w-full text-left p-2 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 transition-all group"
                >
                  {entry.result.image_base64 && (
                    <img
                      src={entry.result.image_base64}
                      alt={entry.prompt}
                      className="w-full h-20 object-cover rounded-lg border border-slate-100 mb-1.5"
                    />
                  )}
                  <p className="text-xs font-medium text-slate-700 line-clamp-2 group-hover:text-sky-700">
                    {entry.prompt}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* Studio Center Panel */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Prompt Form */}
          <div className="glass-panel p-5 space-y-4 border border-slate-200 bg-white">
            <form onSubmit={handleFormSubmit} className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Compare monthly revenue vs gross profit for 2024 and 2025 as a dual-axis line chart…"
                  disabled={loading}
                  className="w-full pl-4 pr-10 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white disabled:opacity-60 transition-all"
                />
                {prompt && !loading && (
                  <button
                    type="button"
                    onClick={() => {
                      setPrompt('');
                      inputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="px-6 py-3 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-md shadow-sky-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Executing Agent…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Generate Graph</span>
                  </>
                )}
              </button>
            </form>

            {/* Categorized Quick Suggestions */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Suggested Prompts by Category
                </span>
                <span className="text-[11px] text-sky-600 font-medium cursor-pointer hover:underline" onClick={() => setShowSchemaModal(true)}>
                  View 15+ Dataset Columns →
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {SUGGESTION_CATEGORIES.map((cat, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-2">
                    <p className="text-[11px] font-bold text-slate-600">{cat.category}</p>
                    <div className="flex flex-col gap-1.5">
                      {cat.items.map((item, itemIdx) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={itemIdx}
                            onClick={() => handleGenerate(item.prompt)}
                            disabled={loading}
                            className="text-left flex items-center justify-between p-2 rounded-lg bg-white hover:bg-sky-50 hover:border-sky-200 border border-slate-200/60 text-xs text-slate-700 transition-all group"
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <Icon className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                              <span className="truncate group-hover:text-sky-800 font-medium">
                                {item.label}
                              </span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 flex-shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="glass-panel p-5 border border-rose-200 bg-rose-50/80 space-y-2">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-100 rounded-xl flex-shrink-0 text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-rose-800">Generation Notice</h4>
                  <p className="text-xs text-rose-700 mt-0.5 break-words">{error}</p>
                </div>
                <button
                  onClick={() => handleGenerate()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-800 bg-rose-200/80 hover:bg-rose-200 rounded-xl transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            </div>
          )}

          {/* Loading Animation */}
          {loading && <GraphSkeleton />}

          {/* Rendered Graph Result */}
          {!loading && result?.image_base64 && (
            <div className="glass-panel p-6 space-y-5 border border-slate-200 bg-white">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">
                        Generated Visualization
                      </span>
                      {result.chart_type && (
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Python Matplotlib Vector Plot · 300 DPI
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedImageModal(result.image_base64)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Expand</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 rounded-xl shadow-xs transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG</span>
                  </button>
                </div>
              </div>

              {/* Main Chart Image Container */}
              <div
                className="rounded-2xl overflow-hidden border border-slate-200/90 bg-white p-2 flex items-center justify-center cursor-pointer group relative shadow-2xs"
                onClick={() => setSelectedImageModal(result.image_base64)}
              >
                <img
                  src={result.image_base64}
                  alt={`Generated chart: ${result.prompt}`}
                  className="w-full h-auto object-contain max-h-[580px] rounded-xl group-hover:scale-[1.005] transition-transform"
                />
                <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                  <span className="bg-slate-900/80 text-white text-xs px-3.5 py-1.5 rounded-full font-semibold shadow-lg">
                    Click to Zoom High-Res
                  </span>
                </div>
              </div>

              {/* Prompt Box */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Executed Query Prompt
                  </span>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">"{result.prompt}"</p>
                </div>
                <button
                  onClick={copyPromptText}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                  title="Copy Prompt"
                >
                  {copiedPrompt ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* AI Insights & Statistical Summary */}
              {result.insights && (
                <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                      Automated Statistical Insights
                    </span>
                  </div>
                  <div className="text-xs text-indigo-950 leading-relaxed space-y-1">
                    {result.insights.split('\n').map((line, i) => (
                      <p
                        key={i}
                        dangerouslySetInnerHTML={{
                          __html: line
                            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                            .replace(/`(.+?)`/g, '<code class="bg-indigo-100 text-indigo-800 px-1 rounded text-[11px]">$1</code>'),
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!loading && !result && !error && (
            <div className="glass-panel p-12 flex flex-col items-center justify-center text-center space-y-4 border border-slate-200 bg-white">
              <div className="p-4 bg-gradient-to-tr from-sky-100 to-indigo-100 text-sky-700 rounded-3xl">
                <BarChart2 className="w-10 h-10" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-lg font-bold text-slate-800">
                  Ready to Synthesize Visualizations
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Type any natural language prompt or pick a preset above. The autonomous AI Agent will inspect the 39-column dataset, generate custom Python code, and return publication-quality figures in seconds.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dataset Schema Reference Modal */}
      {showSchemaModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowSchemaModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TableProperties className="w-5 h-5 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-800">Available Dataset Schema</h3>
              </div>
              <button
                onClick={() => setShowSchemaModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1 text-xs">
              <p className="text-slate-500 mb-3">
                Click any column to copy or include it in your next prompt:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DATASET_COLUMNS.map((col) => (
                  <div
                    key={col.name}
                    onClick={() => {
                      setPrompt((prev) => (prev ? `${prev} by ${col.name}` : `Show ${col.name}`));
                      setShowSchemaModal(false);
                      inputRef.current?.focus();
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 cursor-pointer transition-all flex flex-col justify-between group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 font-mono group-hover:text-sky-700">
                        {col.name}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {col.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{col.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* High-Res Image Modal */}
      {selectedImageModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedImageModal(null)}
        >
          <div
            className="relative bg-white rounded-2xl p-4 max-w-5xl max-h-[92vh] overflow-auto shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700">High-Resolution Plot View</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button
                  onClick={() => setSelectedImageModal(null)}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <img
              src={selectedImageModal}
              alt="High resolution graph"
              className="w-full h-auto rounded-xl object-contain max-h-[75vh]"
            />
          </div>
        </div>
      )}
    </div>
  );
};
