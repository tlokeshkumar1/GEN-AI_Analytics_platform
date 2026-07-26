import React from 'react';
import { HelpCircle } from 'lucide-react';

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ onSelect }) => {
  const questions = [
    "Bar chart of total Net Revenue by Region",
    "Plot Gross Margin % by Category",
    "Line graph of quarterly revenue trend",
    "Scatter plot of DiscountPercent vs GrossMarginPercent",
    "What were the top drivers for Q3 enterprise software profit margin?",
    "Pie chart of Net Revenue breakdown by IndustryVertical"
  ];

  return (
    <div className="p-4 bg-sky-50/50 rounded-xl border border-sky-100 mb-4">
      <div className="flex items-center text-xs font-semibold text-sky-800 mb-2.5">
        <HelpCircle className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
        Suggested Analytics Questions
      </div>
      <div className="flex flex-wrap gap-2">
        {questions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(q)}
            className="text-xs bg-white text-slate-700 hover:text-sky-600 border border-slate-200 hover:border-sky-300 px-3 py-1.5 rounded-lg shadow-xs hover:shadow-sm transition-all text-left"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};
