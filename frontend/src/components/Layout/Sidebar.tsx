import React from 'react';
import { LayoutDashboard, MessageSquare, BarChart2, Sparkles } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Analytics Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'Production RAG Chat', icon: MessageSquare },
    { id: 'graph', label: 'Custom Graph Generation', icon: BarChart2 },
  ];

  return (
    <aside className="w-64 bg-white/90 backdrop-blur-md border-r border-slate-200 flex flex-col justify-between p-4 min-h-screen shadow-sm">
      <div>
        <div className="flex items-center space-x-3 px-3 py-4 mb-6 border-b border-slate-100">
          <div className="p-2 bg-gradient-to-tr from-sky-500 to-blue-600 rounded-xl text-white shadow-md shadow-sky-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight gradient-text">GEN-AI Platform</h1>
            <span className="text-[10px] text-sky-600 uppercase font-semibold tracking-wider">SAP HANA & AI Core</span>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 border border-sky-200/80 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-500">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-slate-700">SAP BTP Runtime</span>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        <p className="text-[11px] text-slate-400">Cloud Foundry MTA Ready</p>
      </div>
    </aside>
  );
};
