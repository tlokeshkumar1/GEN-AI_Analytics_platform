import React, { useState } from 'react';
import { NeovaticLogo } from './NeovaticLogo';

interface HeaderProps {
  onOpenCommandPalette: () => void;
  onNavigate: (path: string) => void;
  onToggleSidebar: () => void;
  activePath: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCommandPalette,
  onNavigate,
  onToggleSidebar,
  activePath,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleGlobalSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
    }, 900);
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-[60px] sm:h-[72px] z-50 bg-[#f9f9f7]/95 backdrop-blur-md border-b border-[#e2e3e1] flex items-center justify-between px-2.5 sm:px-4 md:px-margin select-none">
      {/* Left: Mobile Drawer Trigger + Brand Lockup */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        {/* Mobile / Tablet Menu Button */}
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="lg:hidden flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 -ml-1 rounded-xl text-[#1a1c1b] hover:bg-[#eeeeec] transition-colors focus:outline-none"
        >
          <span className="material-symbols-outlined text-[22px] sm:text-[24px]">menu</span>
        </button>

        {/* Brand Lockup */}
        <div 
          className="flex items-center cursor-pointer min-w-0"
          onClick={() => onNavigate('executive-dashboard')}
        >
          <NeovaticLogo size={28} />
        </div>
      </div>

      {/* Center: Global Quick Jump Input Bar */}
      <div className="flex-1 max-w-xl mx-2 sm:mx-space-lg hidden md:block">
        <div 
          onClick={onOpenCommandPalette}
          className="relative flex items-center w-full cursor-pointer group"
        >
          <span className="material-symbols-outlined absolute left-3 text-[#747878] text-[18px] group-hover:text-[#1a1c1b] transition-colors">
            search
          </span>
          <input 
            readOnly
            value=""
            placeholder="Quick jump (e.g., 'Custom Graphs', 'RAG Chat')..." 
            className="w-full h-9 pl-9 pr-14 rounded-xl bg-[#f4f4f2] hover:bg-[#eeeeec] text-[#1a1c1b] placeholder:text-[#747878] font-body-sm text-body-sm focus:outline-none transition-colors cursor-pointer" 
            type="text"
          />
          <div className="absolute right-2.5 flex items-center gap-1 pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#e2e3e1] text-[#747878] rounded">⌘K</kbd>
          </div>
        </div>
      </div>

      {/* Right: Mobile Search Icon + Status Indicators + User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-space-sm shrink-0">
        {/* Search icon trigger on mobile */}
        <button
          onClick={onOpenCommandPalette}
          aria-label="Search and command palette"
          className="md:hidden flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full hover:bg-[#eeeeec] text-[#1a1c1b] transition-colors"
        >
          <span className="material-symbols-outlined text-[19px]">search</span>
        </button>

        {/* Live Cluster Indicators on Desktop & Tablet */}
        <div className="hidden xl:flex items-center gap-space-sm">
          {/* HANA Vector Pill */}
          <div 
            onClick={handleGlobalSync}
            title="Click to ping SAP HANA in-memory vector store"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f4f4f2] hover:bg-[#eeeeec] transition-colors cursor-pointer"
          >
            <span className={`w-1.5 h-1.5 rounded-full bg-[#111111] ${syncing ? 'animate-ping' : ''}`}></span>
            <span className="font-label-sm text-label-sm text-[#444748] font-medium">
              HANA Vector: {syncing ? 'SYNCING...' : 'ACTIVE'}
            </span>
          </div>

          {/* AI Core Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f4f4f2]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5e5e5e]"></span>
            <span className="font-label-sm text-label-sm text-[#444748] font-medium">
              AI Core: GPT-4o
            </span>
          </div>

          {/* Health Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f4f4f2]">
            <span className="material-symbols-outlined text-[14px] text-[#444748]">
              check_circle
            </span>
            <span className="font-label-sm text-label-sm text-[#444748] font-medium">
              Healthy
            </span>
          </div>
        </div>

        {/* User Profile Lockup */}
        <div className="relative">
          <div 
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-[#f4f4f2] transition-colors"
          >
            <div className="hidden 2xl:flex flex-col text-right">
              <span className="font-label-md text-label-md text-[#1a1c1b] font-medium leading-tight">
                Analytics Director
              </span>
              <span className="font-label-sm text-[10px] text-[#747878] leading-tight">
                Enterprise Admin
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#111111] flex items-center justify-center text-white shadow-sm shrink-0">
              <span className="material-symbols-outlined text-white text-[18px]">
                person
              </span>
            </div>
          </div>

          {/* Profile Dropdown Menu */}
          {profileOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setProfileOpen(false)} 
              />
              <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-24px)] rounded-xl bg-white border border-[#e2e3e1] shadow-xl p-3 z-50 text-left animate-in fade-in slide-in-from-top-2">
                <div className="px-2 py-1.5 border-b border-[#eeeeec] mb-1.5">
                  <div className="font-label-md text-[#1a1c1b] font-semibold">Lokesh Kumar</div>
                  <div className="font-label-sm text-[#747878]">Enterprise Analytics Director</div>
                  <div className="font-label-sm text-[10px] text-[#547A9B] mt-0.5 truncate">SAP BTP Tenant: us10-prod-78</div>
                </div>

                <div className="space-y-0.5 text-body-sm text-[#444748]">
                  <button 
                    onClick={() => { setProfileOpen(false); onNavigate('user-management'); }}
                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-[#f4f4f2] flex items-center justify-between transition-colors"
                  >
                    <span>User Management</span>
                    <span className="material-symbols-outlined text-[16px] text-[#747878]">chevron_right</span>
                  </button>
                  <button 
                    onClick={() => { setProfileOpen(false); onNavigate('system-settings'); }}
                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-[#f4f4f2] flex items-center justify-between transition-colors"
                  >
                    <span>System Settings</span>
                    <span className="material-symbols-outlined text-[16px] text-[#747878]">chevron_right</span>
                  </button>
                  <button 
                    onClick={() => { setProfileOpen(false); onNavigate('alerts-notifications'); }}
                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-[#f4f4f2] flex items-center justify-between transition-colors"
                  >
                    <span>Alerts & Notifications</span>
                    <span className="material-symbols-outlined text-[16px] text-[#747878]">chevron_right</span>
                  </button>
                  <button 
                    onClick={() => { setProfileOpen(false); onNavigate('data-sources'); }}
                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-[#f4f4f2] flex items-center justify-between transition-colors"
                  >
                    <span>HDI Data Sources</span>
                    <span className="material-symbols-outlined text-[16px] text-[#747878]">chevron_right</span>
                  </button>
                </div>

                <div className="pt-2 mt-2 border-t border-[#eeeeec]">
                  <div className="flex items-center justify-between px-2 text-[10px] text-[#747878] font-mono">
                    <span>HANA 4.2</span>
                    <span className="text-emerald-700">ONLINE</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
