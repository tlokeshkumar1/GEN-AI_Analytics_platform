import React from 'react';
import { Card } from '../Common/Card';
import { Sparkles } from 'lucide-react';

interface InsightsProps {
  insights: string;
}

export const Insights: React.FC<InsightsProps> = ({ insights }) => {
  return (
    <Card
      title="SAP AI Core Executive Summary"
      subtitle="Automated Takeaways"
      action={<Sparkles className="w-5 h-5 text-sky-600" />}
    >
      <div className="p-4 bg-sky-50 border border-sky-200/80 rounded-xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
        {insights}
      </div>
    </Card>
  );
};
