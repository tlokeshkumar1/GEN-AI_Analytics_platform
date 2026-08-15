import React from 'react';
import { Sparkles, TrendingUp, BarChart2, PieChart, Activity } from 'lucide-react';

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ onSelect }) => {
  const suggestions = [
    { text: 'Bar chart of Net Revenue by Region', icon: BarChart2 },
    { text: 'What were the primary drivers for 2024 profit margins?', icon: Sparkles },
    { text: 'Plot Gross Margin % across Categories', icon: Activity },
    { text: 'Line graph of quarterly revenue target vs actual', icon: TrendingUp },
    { text: 'Pie chart of sales share by top countries', icon: PieChart },
  ];

  return (
    <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80">
      <div className="flex items-center text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
        <Sparkles className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
        <span>Suggested Analytics & Graph Prompts</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelect(item.text)}
              className="text-xs font-medium bg-white text-slate-700 hover:text-sky-700 hover:bg-sky-50 border border-slate-200/80 hover:border-sky-300 px-3 py-1.5 rounded-xl shadow-2xs transition-all text-left flex items-center gap-1.5 group"
            >
              <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600" />
              <span>{item.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
