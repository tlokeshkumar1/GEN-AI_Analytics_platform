import React from 'react';

interface SidebarProps {
  activePath: string;
  onNavigate: (path: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePath,
  onNavigate,
  isOpen,
  onClose,
}) => {
  const navItems = [
    {
      id: 'executive-dashboard',
      label: 'Executive Dashboard',
      badge: 'Live',
      icon: 'dashboard',
    },
    {
      id: 'ai-dashboards-rag-chat',
      label: 'RAG Chat',
      badge: 'Llama-3.2',
      icon: 'chat',
    },
    {
      id: 'build-your-kpi-graph-studio',
      label: 'Build Your KPI (Graph Studio)',
      badge: 'Agent',
      icon: 'query_stats',
    },
    {
      id: 'upload-dataset',
      label: 'Upload Dataset (Excel/CSV)',
      badge: null,
      icon: 'upload_file',
    },
    {
      id: 'data-explorer',
      label: 'Data Explorer',
      badge: 'Insight',
      icon: 'terminal',
    },
    {
      id: 'alerts-notifications',
      label: 'Alerts & Notifications',
      badge: null,
      icon: 'notifications',
    },
    {
      id: 'reports-library',
      label: 'Reports Library',
      badge: null,
      icon: 'folder',
    },
    {
      id: 'data-sources',
      label: 'Data Sources',
      badge: null,
      icon: 'database',
    },
    {
      id: 'user-management',
      label: 'User Management',
      badge: null,
      icon: 'person',
    },
    {
      id: 'system-settings',
      label: 'System Settings',
      badge: null,
      icon: 'settings',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed left-0 top-0 lg:top-[72px] bottom-0 w-[280px] sm:w-[260px] bg-[#f4f4f2] border-r border-[#e2e3e1] z-50 lg:z-40 flex flex-col justify-between overflow-y-auto select-none transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-space-md">
          {/* Mobile Drawer Header with Close Button */}
          <div className="flex lg:hidden items-center justify-between pb-3 mb-2 border-b border-[#e2e3e1]">
            <div className="flex flex-col">
              <span className="font-headline-sm text-[16px] font-semibold text-[#1a1c1b]">
                NEOVATIC
              </span>
              <span className="text-[10px] text-[#747878] uppercase font-mono">
                SAP HANA & AI CORE
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close navigation"
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#e8e8e6] text-[#1a1c1b]"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="px-space-sm py-space-xs mb-space-sm flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-[#747878] font-semibold">
              Platform Navigation
            </span>
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = activePath === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-space-sm py-2.5 sm:py-2 rounded-xl transition-all font-body-sm text-body-sm text-left ${
                    isActive
                      ? 'bg-[#111111] text-white font-medium shadow-sm'
                      : 'text-[#444748] hover:bg-[#e8e8e6] hover:text-[#1a1c1b]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={`material-symbols-outlined text-[17px] ${isActive ? 'text-white' : 'text-[#747878]'}`}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`font-label-sm text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                        isActive
                          ? 'bg-[#e2e3e1] text-[#1a1c1b]'
                          : 'bg-[#e2e3e1] text-[#1a1c1b]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* HANA Operational Status Footer Container */}
        <div className="p-space-md bg-[#e8e8e6]/60 m-space-sm rounded-xl border border-[#dadad8]/40 mb-16 lg:mb-space-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#111111]"></span>
            <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-[#1a1c1b]">
              HANA Cloud Operational
            </span>
          </div>
          <p className="font-label-sm text-label-sm text-[#747878] leading-tight">
            Python Venv · SAP BTP MTA Architecture v1.0.0
          </p>
        </div>
      </aside>
    </>
  );
};
