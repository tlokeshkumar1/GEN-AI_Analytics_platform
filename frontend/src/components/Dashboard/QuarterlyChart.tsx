import React, { useState } from 'react';
import { Card } from '../Common/Card';

interface QuarterlyChartProps {
  data: Array<{ quarter: string; target: number; actual: number }>;
}

export const QuarterlyChart: React.FC<QuarterlyChartProps> = ({ data }) => {
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Group years
  const years = ['2025', '2024', '2023', 'All'];

  const filteredData = React.useMemo(() => {
    if (selectedYear === 'All') return data;
    return data.filter((d) => d.quarter.includes(selectedYear));
  }, [data, selectedYear]);

  const maxVal = Math.max(
    ...filteredData.map((d) => Math.max(d.target, d.actual)),
    1
  );

  return (
    <Card
      title="Quarterly Targets vs Actual"
      subtitle="Budget plan attainment by quarter"
      action={
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg transition-all ${
                selectedYear === y
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        <div className="h-48 flex items-end justify-around gap-2 pt-4">
          {filteredData.map((item, idx) => {
            const targetPct = (item.target / maxVal) * 100;
            const actualPct = (item.actual / maxVal) * 100;
            const achievementRate = item.target > 0 ? (item.actual / item.target) * 100 : 100;
            const isExceeded = item.actual >= item.target;
            const isHovered = hoveredIdx === idx;

            // Clean format: extract 'Q1', 'Q2', etc.
            const quarterLabel = item.quarter.includes('Q') 
              ? item.quarter.substring(item.quarter.indexOf('Q')) 
              : item.quarter;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center gap-1.5 relative group cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute -top-14 bg-slate-900 text-white text-[11px] p-2 rounded-xl shadow-xl z-30 pointer-events-none whitespace-nowrap border border-slate-700 animate-in fade-in duration-100">
                    <div className="font-semibold text-slate-200 mb-0.5">{item.quarter}</div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-slate-300">
                        Target: ${(item.target / 1000000).toFixed(1)}M
                      </span>
                      <span className="text-emerald-300 font-bold">
                        Actual: ${(item.actual / 1000000).toFixed(1)}M ({achievementRate.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                )}

                {/* Bars Container */}
                <div className="w-full flex items-end justify-center gap-1 h-36 bg-slate-50/80 p-1.5 rounded-xl border border-slate-200/80 group-hover:border-emerald-300 transition-all">
                  {/* Target Column */}
                  <div
                    style={{ height: `${Math.max(targetPct, 5)}%` }}
                    className="w-1/2 bg-slate-300 rounded-t-md transition-all group-hover:bg-slate-400"
                    title={`Target: $${(item.target / 1000000).toFixed(1)}M`}
                  />
                  {/* Actual Column */}
                  <div
                    style={{ height: `${Math.max(actualPct, 5)}%` }}
                    className={`w-1/2 rounded-t-md transition-all shadow-xs ${
                      isExceeded
                        ? 'bg-gradient-to-t from-emerald-600 to-teal-500 group-hover:brightness-110'
                        : 'bg-gradient-to-t from-amber-600 to-amber-400'
                    }`}
                    title={`Actual: $${(item.actual / 1000000).toFixed(1)}M`}
                  />
                </div>

                {/* Quarter Label & Achievement Badge */}
                <span className="text-[11px] font-bold text-slate-700">
                  {quarterLabel}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                    isExceeded
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {achievementRate.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center space-x-6 text-xs text-slate-600 pt-2 border-t border-slate-100 font-medium">
          <span className="flex items-center">
            <span className="w-3 h-3 rounded bg-slate-300 mr-1.5"></span> Target Budget
          </span>
          <span className="flex items-center">
            <span className="w-3 h-3 rounded bg-gradient-to-tr from-emerald-600 to-teal-500 mr-1.5 shadow-xs"></span> Actual Realized
          </span>
        </div>
      </div>
    </Card>
  );
};
