import React from 'react';
import { Card } from '../Common/Card';

interface CountryChartProps {
  data: Array<{ country: string; revenue: number }>;
}

export const CountryChart: React.FC<CountryChartProps> = ({ data }) => {
  const maxVal = Math.max(...data.map(d => d.revenue), 1);

  return (
    <Card title="Top Revenue by Country" subtitle="Primary geographic markets">
      <div className="space-y-3 py-2">
        {data.map((item, idx) => {
          const widthPct = (item.revenue / maxVal) * 100;
          return (
            <div key={idx} className="flex items-center space-x-3 text-xs">
              <span className="w-28 text-slate-700 font-medium truncate">{item.country}</span>
              <div className="flex-1 bg-slate-100 rounded-lg h-5 relative overflow-hidden flex items-center px-2 border border-slate-200/80">
                <div
                  style={{ width: `${widthPct}%` }}
                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-indigo-500 to-sky-500 rounded-lg transition-all"
                />
                <span className="relative z-10 font-bold text-white text-[11px] drop-shadow-xs">
                  ${(item.revenue / 1000000).toFixed(2)}M
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
