import React from 'react';
import { Card } from '../Common/Card';

interface DynamicChartProps {
  data: Array<Record<string, any>>;
  recommendedChart?: string;
}

export const DynamicChart: React.FC<DynamicChartProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  const firstRow = data[0];
  const keys = Object.keys(firstRow);
  const labelKey = keys[0];
  const valueKey = keys.find(k => typeof firstRow[k] === 'number') || keys[1];

  const maxVal = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);

  return (
    <Card title="Generated Visualization" subtitle={`Plotting ${valueKey} by ${labelKey}`}>
      <div className="space-y-3 py-2">
        {data.map((item, idx) => {
          const val = Number(item[valueKey]) || 0;
          const widthPct = (val / maxVal) * 100;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-800">{String(item[labelKey])}</span>
                <span className="text-sky-600">
                  {typeof val === 'number' ? val.toLocaleString() : val}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-lg h-3 overflow-hidden border border-slate-200/80">
                <div
                  style={{ width: `${widthPct}%` }}
                  className="h-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 rounded-lg transition-all duration-500"
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
