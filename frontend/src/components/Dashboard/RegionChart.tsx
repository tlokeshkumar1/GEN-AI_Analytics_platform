import React from 'react';
import { Card } from '../Common/Card';

interface RegionChartProps {
  data: Array<{ region: string; revenue: number; share: number }>;
}

export const RegionChart: React.FC<RegionChartProps> = ({ data }) => {
  const colors = ['#0284c7', '#2563eb', '#7c3aed', '#db2777'];

  return (
    <Card title="Regional Revenue Distribution" subtitle="Share of global sales">
      <div className="space-y-4 py-2">
        {data.map((item, idx) => {
          const color = colors[idx % colors.length];
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-800">{item.region}</span>
                <span className="text-slate-500">${(item.revenue / 1000000).toFixed(2)}M ({item.share}%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
                <div
                  style={{ width: `${item.share}%`, backgroundColor: color }}
                  className="h-full rounded-full transition-all duration-500 shadow-xs"
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
