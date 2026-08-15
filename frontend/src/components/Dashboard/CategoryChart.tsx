import React from 'react';
import { Card } from '../Common/Card';
import { Layers, Wrench, Shield, Bot, Factory, Boxes } from 'lucide-react';

interface CategoryChartProps {
  data: Array<{ category: string; revenue: number }>;
}

export const CategoryChart: React.FC<CategoryChartProps> = ({ data }) => {
  const maxVal = Math.max(...data.map((d) => d.revenue), 1);
  const totalRev = data.reduce((acc, d) => acc + d.revenue, 0);

  const getCategoryIcon = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('handling') || c.includes('storage') || c.includes('racking')) return Boxes;
    if (c.includes('machinery') || c.includes('heavy')) return Factory;
    if (c.includes('automation') || c.includes('robot')) return Bot;
    if (c.includes('safety') || c.includes('compliance')) return Shield;
    if (c.includes('tool')) return Wrench;
    return Layers;
  };

  return (
    <Card
      title="Product Category Revenue"
      subtitle="Contribution by industrial sector"
      action={
        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
          <Layers className="w-4 h-4" />
        </div>
      }
    >
      <div className="space-y-3 py-1">
        {data.map((item, idx) => {
          const pct = (item.revenue / maxVal) * 100;
          const share = totalRev > 0 ? (item.revenue / totalRev) * 100 : 0;
          const Icon = getCategoryIcon(item.category);

          return (
            <div key={idx} className="space-y-1 group">
              <div className="flex justify-between items-center text-xs font-semibold">
                <div className="flex items-center space-x-2 truncate">
                  <div className="p-1 bg-slate-100 rounded text-slate-600 group-hover:text-sky-600 group-hover:bg-sky-50 transition-colors flex-shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-slate-800 truncate group-hover:text-sky-600 transition-colors">
                    {item.category}
                  </span>
                </div>
                <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                  <span className="text-sky-700 font-bold">
                    ${(item.revenue / 1000000).toFixed(1)}M
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({share.toFixed(0)}%)
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div className="w-full bg-slate-100 rounded-lg h-2.5 overflow-hidden border border-slate-200/70 p-0.5">
                <div
                  style={{ width: `${Math.min(100, Math.max(pct, 4))}%` }}
                  className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-lg transition-all duration-500 group-hover:brightness-110 shadow-xs"
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
