import React from 'react';
import { Card } from '../Common/Card';

interface RevenueChartProps {
  data: Array<{ month: string; revenue: number; profit: number }>;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const maxVal = Math.max(...data.map(d => d.revenue), 1);

  return (
    <Card title="Monthly Revenue & Profit Trend" subtitle="Fiscal Year 2024 (USD)">
      <div className="h-64 flex items-end justify-between gap-2 pt-6 pb-2">
        {data.map((item, idx) => {
          const heightPct = (item.revenue / maxVal) * 100;
          const profitPct = (item.profit / maxVal) * 100;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="w-full bg-slate-100 rounded-t-lg h-48 flex items-end justify-center p-1 relative border border-slate-200/60">
                {/* Revenue Bar */}
                <div
                  style={{ height: `${heightPct}%` }}
                  className="w-full bg-gradient-to-t from-sky-500 to-sky-400 rounded-t group-hover:brightness-110 transition-all relative shadow-xs"
                >
                  {/* Profit overlay */}
                  <div
                    style={{ height: `${(profitPct / heightPct) * 100}%` }}
                    className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t opacity-90"
                  />
                </div>
              </div>

              {/* Tooltip */}
              <div className="absolute -top-12 hidden group-hover:flex flex-col items-center bg-slate-900 border border-slate-700 text-[10px] p-2 rounded-lg z-20 shadow-xl whitespace-nowrap text-white">
                <span className="text-sky-300 font-semibold">{item.month}: ${(item.revenue / 1000).toFixed(0)}K Rev</span>
                <span className="text-indigo-300">${(item.profit / 1000).toFixed(0)}K Profit</span>
              </div>

              <span className="text-[11px] font-medium text-slate-600 mt-1">{item.month}</span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center space-x-6 text-xs text-slate-600 mt-4 border-t border-slate-100 pt-3 font-medium">
        <span className="flex items-center"><span className="w-3 h-3 rounded bg-sky-400 mr-2"></span> Total Revenue</span>
        <span className="flex items-center"><span className="w-3 h-3 rounded bg-indigo-500 mr-2"></span> Total Profit</span>
      </div>
    </Card>
  );
};
