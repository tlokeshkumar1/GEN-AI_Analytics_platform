import React from 'react';
import { Bell, Search, Database, Cpu } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
      <div className="flex items-center space-x-4">
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search sales metrics, vector docs..."
            className="w-full glass-input text-xs pl-9 pr-4 py-2 bg-slate-50 border-slate-200 text-slate-800 focus:bg-white"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
          <Database className="w-3.5 h-3.5 text-sky-600" />
          <span className="text-slate-700 font-medium">HANA Vector Engine</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-mono text-[10px] font-bold">ACTIVE</span>
        </div>

        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
          <Cpu className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-slate-700 font-medium">SAP AI Core</span>
          <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-mono text-[10px] font-bold">v2 API</span>
        </div>

        <button className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 relative transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-500"></span>
        </button>

        <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
            AD
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-800">Analytics Director</p>
            <p className="text-[10px] text-slate-500">Enterprise User</p>
          </div>
        </div>
      </div>
    </header>
  );
};
