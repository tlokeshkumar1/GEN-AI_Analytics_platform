import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  BarChart2,
  PieChart,
  Activity,
  Search,
  Compass,
} from 'lucide-react';

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ onSelect }) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'charts' | 'kpis' | 'orders'>('all');

  const suggestions = [
    {
      category: 'charts',
      text: 'Bar chart of Net Revenue by Region',
      icon: BarChart2,
      badge: 'Graph',
    },
    {
      category: 'kpis',
      text: 'What are the primary drivers of 2024 profit margins and top product performers?',
      icon: Sparkles,
      badge: 'Executive',
    },
    {
      category: 'charts',
      text: 'Plot Gross Margin % across Categories',
      icon: Activity,
      badge: 'Graph',
    },
    {
      category: 'kpis',
      text: 'Summarize quarterly revenue target vs actual performance',
      icon: TrendingUp,
      badge: 'Financials',
    },
    {
      category: 'charts',
      text: 'Pie chart of sales share by top countries',
      icon: PieChart,
      badge: 'Graph',
    },
    {
      category: 'orders',
      text: 'Lookup Order SO-106760 complete breakdown',
      icon: Search,
      badge: 'Order ID',
    },
  ];

  const filtered =
    activeCategory === 'all'
      ? suggestions
      : suggestions.filter((s) => s.category === activeCategory);

  return (
    <div className="p-4 bg-gradient-to-b from-slate-50/90 to-slate-100/50 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
      {/* Header & Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center text-xs font-bold text-slate-700 uppercase tracking-wider">
          <div className="p-1 rounded-md bg-indigo-100 text-indigo-700 mr-2">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <span>Suggested Inquiries & Visual Analytics</span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs text-[11px]">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveCategory('charts')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeCategory === 'charts'
                ? 'bg-sky-600 text-white shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Charts
          </button>
          <button
            onClick={() => setActiveCategory('kpis')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeCategory === 'kpis'
                ? 'bg-violet-600 text-white shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Executive Insights
          </button>
          <button
            onClick={() => setActiveCategory('orders')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeCategory === 'orders'
                ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Order Lookup
          </button>
        </div>
      </div>

      {/* Prompts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {filtered.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelect(item.text)}
              className="text-xs font-medium bg-white hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-900 border border-slate-200/90 hover:border-indigo-300 p-2.5 rounded-xl shadow-2xs hover:shadow-xs transition-all text-left flex items-start justify-between gap-2 group"
            >
              <div className="flex items-start gap-2">
                <div className="p-1 rounded-lg bg-slate-100 group-hover:bg-indigo-100 group-hover:text-indigo-600 text-slate-500 transition-colors flex-shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="leading-snug text-slate-800 group-hover:text-indigo-950 font-medium">
                  {item.text}
                </span>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 group-hover:bg-indigo-100 group-hover:text-indigo-700 text-slate-500 flex-shrink-0">
                {item.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
