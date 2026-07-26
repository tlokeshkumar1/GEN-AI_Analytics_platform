import React, { useState, useRef, useCallback } from 'react';
import {
  Sparkles, BarChart2, Send, Download, Clock, ChevronRight,
  AlertTriangle, Lightbulb, TrendingUp, PieChart, Activity,
  LayoutGrid, Loader2, X, RefreshCw, History, ChevronLeft,
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

// ── Suggestion chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { label: 'Monthly sales by region',      icon: TrendingUp, prompt: 'Show monthly sales by region as a line chart'                },
  { label: 'Revenue by category (Pie)',     icon: PieChart,   prompt: 'Create a pie chart of revenue by product category'          },
  { label: 'Quarterly profit by country',  icon: BarChart2,  prompt: 'Compare quarterly profit across countries as a bar chart'    },
  { label: 'Discount vs Margin (Scatter)', icon: Activity,   prompt: 'Scatter plot of discount percent vs gross margin by region'  },
  { label: 'Stacked revenue by channel',   icon: LayoutGrid, prompt: 'Stacked bar chart of net revenue by region and channel'      },
  { label: 'Cost funnel by category',      icon: Sparkles,   prompt: 'Create a funnel chart of total cost by category'             },
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
  dynamic:      { bg: 'bg-slate-100',  text: 'text-slate-700',  label: 'AI Chart'           },
};

function getChartBadge(type?: string) {
  return CHART_BADGE[type ?? ''] ?? CHART_BADGE['dynamic'];
}

// ── Skeleton loader ──────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  'Analyzing dataset schema…',
  'Interpreting your request…',
  'Selecting chart type & columns…',
  'Generating Python visualization script…',
  'Executing in venv environment…',
  'Encoding & returning graph image…',
];

const GraphSkeleton: React.FC = () => {
  const [stepIdx, setStepIdx] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx(prev => Math.min(prev + 1, PIPELINE_STEPS.length - 1));
    }, 900);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel p-6 animate-pulse-soft space-y-5">
      {/* Image placeholder */}
      <div className="w-full h-72 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
          <span className="text-sm font-medium text-slate-500">Generating visualization…</span>
        </div>
      </div>

      {/* Pipeline steps */}
      <div className="space-y-2">
        {PIPELINE_STEPS.map((step, i) => (
          <div
            key={step}
            className={`flex items-center gap-3 text-sm transition-all duration-500 ${
              i < stepIdx
                ? 'text-emerald-600'
                : i === stepIdx
                ? 'text-sky-600 font-medium'
                : 'text-slate-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                i < stepIdx
                  ? 'bg-emerald-100 text-emerald-600'
                  : i === stepIdx
                  ? 'bg-sky-100 text-sky-600 animate-pulse'
                  : 'bg-slate-100 text-slate-300'
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

// ── Main component ────────────────────────────────────────────────────────────

export const CustomGraphPage: React.FC = () => {
  const [prompt, setPrompt]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<GraphResponse | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [history, setHistory]     = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef                  = useRef<HTMLInputElement>(null);

  // ── Submit handler ──────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async (customPrompt?: string) => {
    const finalPrompt = (customPrompt ?? prompt).trim();
    if (!finalPrompt) return;

    setLoading(true);
    setError(null);
    setResult(null);
    if (customPrompt) setPrompt(customPrompt);

    try {
      const res = await generateCustomGraph(finalPrompt);
      setResult(res);
      setHistory(prev => [
        {
          id: Date.now().toString(),
          prompt: finalPrompt,
          result: res,
          timestamp: new Date(),
        },
        ...prev.slice(0, 19), // Keep last 20
      ]);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to generate graph');
    } finally {
      setLoading(false);
    }
  }, [prompt]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerate();
  };

  // ── Download handler ────────────────────────────────────────────────────────

  const handleDownload = () => {
    if (!result?.image_base64) return;
    const a   = document.createElement('a');
    a.href    = result.image_base64;
    a.download = `graph_${Date.now()}.png`;
    a.click();
  };

  // ── Restore from history ────────────────────────────────────────────────────

  const restoreFromHistory = (entry: HistoryEntry) => {
    setResult(entry.result);
    setPrompt(entry.prompt);
    setError(null);
    setShowHistory(false);
  };

  // ── Badge ───────────────────────────────────────────────────────────────────

  const badge = getChartBadge(result?.chart_type);

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-0 min-h-0">

      {/* ── History Rail ─────────────────────────────────────────────────────── */}
      <aside
        className={`flex-shrink-0 transition-all duration-300 overflow-hidden ${
          showHistory ? 'w-72' : 'w-0'
        }`}
      >
        <div className="w-72 h-full glass-panel rounded-2xl mr-4 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-sky-600" />
              <span className="text-sm font-semibold text-slate-700">History</span>
              <span className="text-[10px] bg-sky-100 text-sky-700 rounded-full px-2 py-0.5 font-bold">
                {history.length}
              </span>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              id="close-history-btn"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {history.length === 0 ? (
              <p className="text-xs text-slate-400 text-center mt-8">No graphs yet.<br />Generate one to see it here.</p>
            ) : (
              history.map(entry => (
                <button
                  key={entry.id}
                  id={`history-item-${entry.id}`}
                  onClick={() => restoreFromHistory(entry)}
                  className="w-full text-left rounded-xl overflow-hidden border border-slate-200 hover:border-sky-300 hover:shadow-sm transition-all group"
                >
                  {entry.result.image_base64 && (
                    <img
                      src={entry.result.image_base64}
                      alt={entry.prompt}
                      className="w-full h-20 object-cover"
                    />
                  )}
                  <div className="px-2.5 py-2 bg-white">
                    <p className="text-[11px] text-slate-600 line-clamp-2 group-hover:text-sky-700 transition-colors">
                      {entry.prompt}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 space-y-5 min-w-0">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="glass-panel p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-xl shadow-lg shadow-sky-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Custom Graph Generation</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Describe any business visualization in natural language · Powered by Python AI Agent + Matplotlib / Seaborn
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button
                  id="open-history-btn"
                  onClick={() => setShowHistory(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-sky-700 bg-slate-100 hover:bg-sky-50 rounded-lg transition-all border border-slate-200 hover:border-sky-200"
                >
                  <History className="w-3.5 h-3.5" />
                  History ({history.length})
                </button>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-semibold text-emerald-700">venv Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Input Form ─────────────────────────────────────────────────────── */}
        <div className="glass-panel p-5 space-y-4">
          <form onSubmit={handleFormSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                id="graph-prompt-input"
                type="text"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="e.g. Show monthly sales by region as a line chart…"
                disabled={loading}
                className="w-full pl-4 pr-10 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 disabled:opacity-60 transition-all"
              />
              {prompt && !loading && (
                <button
                  type="button"
                  id="clear-prompt-btn"
                  onClick={() => { setPrompt(''); inputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              id="generate-graph-btn"
              type="submit"
              disabled={loading || !prompt.trim()}
              className="px-5 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl flex items-center gap-2 shadow-md shadow-sky-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              ) : (
                <><Send className="w-4 h-4" /> Generate Graph</>
              )}
            </button>
          </form>

          {/* Suggestion chips */}
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick Suggestions</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(({ label, icon: Icon, prompt: p }) => (
                <button
                  key={label}
                  id={`suggestion-${label.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => handleGenerate(p)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 border border-slate-200 hover:border-sky-200 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  <ChevronRight className="w-3 h-3 opacity-60" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Error State ─────────────────────────────────────────────────────── */}
        {error && (
          <div id="graph-error-panel" className="glass-panel p-5 border border-rose-200 bg-rose-50/80">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-rose-700 mb-1">Graph Generation Failed</p>
                <p className="text-xs text-rose-600 break-words">{error}</p>
              </div>
              <button
                id="retry-graph-btn"
                onClick={() => handleGenerate()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg transition-all whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* ── Loading Skeleton ────────────────────────────────────────────────── */}
        {loading && <GraphSkeleton />}

        {/* ── Result Panel ────────────────────────────────────────────────────── */}
        {!loading && result?.image_base64 && (
          <div id="graph-result-panel" className="glass-panel p-5 space-y-4">
            {/* Result header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BarChart2 className="w-4.5 h-4.5 text-sky-600" />
                <span className="text-sm font-semibold text-slate-700">Generated Visualization</span>
                {result.chart_type && (
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                    {badge.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  Just now
                </div>
                <button
                  id="download-graph-btn"
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PNG
                </button>
              </div>
            </div>

            {/* Graph image */}
            <div className="rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-white">
              <img
                id="generated-graph-image"
                src={result.image_base64}
                alt={`Generated graph: ${result.prompt}`}
                className="w-full object-contain max-h-[540px]"
              />
            </div>

            {/* Prompt used */}
            <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Prompt</p>
              <p className="text-sm text-slate-700 italic">"{result.prompt}"</p>
            </div>

            {/* AI Insights */}
            {result.insights && (
              <div className="px-4 py-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-indigo-500" />
                  <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider">AI Pipeline Insights</p>
                </div>
                <div className="space-y-1">
                  {result.insights.split('\n').map((line, i) => (
                    <p key={i} className="text-xs text-indigo-700 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                                    .replace(/`(.+?)`/g, '<code class="bg-indigo-100 px-1 rounded text-[10px]">$1</code>')
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Empty state ─────────────────────────────────────────────────────── */}
        {!loading && !result && !error && (
          <div className="glass-panel p-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-gradient-to-tr from-sky-100 to-indigo-100 rounded-2xl">
              <BarChart2 className="w-10 h-10 text-sky-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-700 mb-1">Ready to Visualize</h2>
              <p className="text-sm text-slate-400 max-w-md">
                Describe any business chart in natural language. The AI Agent will analyze your dataset,
                generate a Python script, execute it in the venv, and return your visualization — all automatically.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              10-step pipeline · Temp script auto-deleted after each request
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
