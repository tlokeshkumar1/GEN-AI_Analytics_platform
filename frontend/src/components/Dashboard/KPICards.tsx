import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, BarChart3, Award } from 'lucide-react';
import type { KPICard } from '../../services/dashboard';

interface KPICardsProps {
  cards: KPICard[];
}

export const KPICards: React.FC<KPICardsProps> = ({ cards }) => {
  const icons = [DollarSign, Award, ShoppingBag, BarChart3];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card, idx) => {
        const Icon = icons[idx % icons.length];
        const isUp = card.trend === 'up';
        return (
          <div key={idx} className="glass-panel p-5 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.title}</span>
              <div className="p-2.5 bg-sky-50 rounded-xl text-sky-600 group-hover:bg-sky-100 transition-colors">
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <h3 className="text-2xl font-extrabold text-slate-900">{card.value}</h3>
              <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
                isUp ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {isUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {card.change}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
