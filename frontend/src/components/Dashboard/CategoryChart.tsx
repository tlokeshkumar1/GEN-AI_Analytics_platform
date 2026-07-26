import React from 'react';
import { Card } from '../Common/Card';

interface CategoryChartProps {
  data: Array<{ category: string; revenue: number }>;
}

export const CategoryChart: React.FC<CategoryChartProps> = ({ data }) => {
  const maxVal = Math.max(...data.map(d => d.revenue), 1);

  return (
    <Card title="Sales by Product Category" subtitle="Revenue generated across sectors">
      <div className="space-y-3 py-2">
        {data.map((item, idx) => {
          const pct = (item.revenue / maxVal) * 100;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-800">{item.category}</span>
                <span className="text-sky-600">${(item.revenue / 1000000).toFixed(2)}M</span>
              </div>
              <div className="w-full bg-slate-100 rounded-lg h-2.5 overflow-hidden border border-slate-200/80">
                <div
                  style={{ width: `${pct}%` }}
                  className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-lg"
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
