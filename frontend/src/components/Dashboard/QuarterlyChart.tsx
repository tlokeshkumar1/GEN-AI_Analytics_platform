import React from 'react';
import { Card } from '../Common/Card';

interface QuarterlyChartProps {
  data: Array<{ quarter: string; target: number; actual: number }>;
}

export const QuarterlyChart: React.FC<QuarterlyChartProps> = ({ data }) => {
  const maxVal = Math.max(...data.map(d => Math.max(d.target, d.actual)), 1);

  return (
    <Card title="Quarterly Targets vs Actual" subtitle="Performance overview against target">
      <div className="h-56 flex items-end justify-around gap-4 pt-6 pb-2">
        {data.map((item, idx) => {
          const targetPct = (item.target / maxVal) * 100;
          const actualPct = (item.actual / maxVal) * 100;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center gap-1 h-40 bg-slate-50 p-2 rounded-xl border border-slate-200">
                <div
                  style={{ height: `${targetPct}%` }}
                  className="w-1/2 bg-slate-300 rounded-t transition-all"
                  title={`Target: $${(item.target/1000000).toFixed(2)}M`}
                />
                <div
                  style={{ height: `${actualPct}%` }}
                  className="w-1/2 bg-gradient-to-t from-emerald-600 to-teal-500 rounded-t transition-all shadow-xs"
                  title={`Actual: $${(item.actual/1000000).toFixed(2)}M`}
                />
              </div>
              <span className="text-xs font-bold text-slate-700">{item.quarter}</span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center space-x-6 text-xs text-slate-600 mt-2 font-medium">
        <span className="flex items-center"><span className="w-3 h-3 rounded bg-slate-300 mr-2"></span> Target</span>
        <span className="flex items-center"><span className="w-3 h-3 rounded bg-teal-500 mr-2"></span> Actual</span>
      </div>
    </Card>
  );
};
