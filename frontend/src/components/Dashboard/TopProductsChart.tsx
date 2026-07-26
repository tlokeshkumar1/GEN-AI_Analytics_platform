import React from 'react';
import { Card } from '../Common/Card';
import { Package } from 'lucide-react';

interface TopProductsChartProps {
  data: Array<{ product: string; units: number; revenue: number }>;
}

export const TopProductsChart: React.FC<TopProductsChartProps> = ({ data }) => {
  return (
    <Card title="Top Performing Products" subtitle="Leading sales generators by total revenue">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase bg-slate-50/50">
              <th className="py-2.5 pl-3">Product Name</th>
              <th className="py-2.5 text-right px-3">Units Sold</th>
              <th className="py-2.5 text-right pr-3">Total Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 pl-3 flex items-center space-x-2 text-slate-800 font-medium">
                  <Package className="w-4 h-4 text-sky-600" />
                  <span>{item.product}</span>
                </td>
                <td className="py-3 text-right px-3 font-mono text-slate-600">{item.units.toLocaleString()}</td>
                <td className="py-3 text-right pr-3 font-bold text-sky-600">${(item.revenue / 1000).toFixed(0)}K</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
