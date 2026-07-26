import React, { useState } from 'react';
import { Search, Play } from 'lucide-react';
import { queryAnalytics } from '../../services/analytics';
import type { AnalyticsResponse } from '../../services/analytics';
import { SQLResult } from './SQLResult';
import { DynamicChart } from './DynamicChart';
import { Insights } from './Insights';

export const AnalyticsPageComponent: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await queryAnalytics(query);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to execute query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Custom Text-to-SQL Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">Ask natural language questions across all 39 columns of the dataset</p>
        </div>
      </div>

      <div className="glass-panel p-5">
        <form onSubmit={handleQuery} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Compare NetRevenueUSD and GrossMarginUSD across Categories..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm rounded-xl flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {loading ? 'Running...' : 'Run Query'}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <SQLResult sql={result.generated_sql} />
          <DynamicChart data={result.results} recommendedChart={result.recommended_chart} />
          <Insights insights={result.summary_insights} />
        </div>
      )}
    </div>
  );
};
