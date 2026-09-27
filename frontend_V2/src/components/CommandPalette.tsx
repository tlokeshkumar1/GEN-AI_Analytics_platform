import React, { useState, useEffect } from 'react';
import { SCHEMA_COLUMNS } from '../data/mockData';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onSelectQuery?: (query: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSelectQuery,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or toggle
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navigationCommands = [
    { id: 'executive-dashboard', title: 'Executive Sales & Analytics Dashboard', category: 'Navigation', icon: 'dashboard', hint: 'Live metrics, regional breakdown, SKU leaderboard' },
    { id: 'ai-dashboards-rag-chat', title: 'Conversational Analytics & RAG Chat', category: 'Navigation', icon: 'chat', hint: 'Vector-grounded AI assistant' },
    { id: 'build-your-kpi-graph-studio', title: 'Custom Graph Studio', category: 'Navigation', icon: 'query_stats', hint: 'Natural language visualization' },
    { id: 'upload-dataset', title: 'Dataset Management & Ingestion', category: 'Navigation', icon: 'upload_file', hint: 'Upload Excel/CSV to HANA Vector store' },
    { id: 'data-explorer', title: 'Data Explorer & Text-to-SQL Analytics', category: 'Navigation', icon: 'terminal', hint: 'SQL generator across 39 columns' },
    { id: 'alerts-notifications', title: 'Alerts & Margin Thresholds', category: 'Navigation', icon: 'notifications', hint: 'Breach alerts & trigger logs' },
    { id: 'reports-library', title: 'Reports Library & Audit Exports', category: 'Navigation', icon: 'folder', hint: 'PDF/Excel board decks' },
    { id: 'data-sources', title: 'Data Sources & BTP Connectors', category: 'Navigation', icon: 'cloud_sync', hint: 'SAP S/4HANA & HDI containers' },
    { id: 'user-management', title: 'User Management & Roles', category: 'Navigation', icon: 'group', hint: 'Tier-1 RBAC access controls' },
    { id: 'system-settings', title: 'System Settings & In-Memory Config', category: 'Navigation', icon: 'settings', hint: 'Embedding models and cache parameters' },
  ];

  const quickPrompts = [
    'Show monthly Net Revenue and Gross Margin comparison across 2024 and 2025',
    'Compare gross profit margin across top 4 product categories for 2024',
    'Compare NetRevenueUSD and GrossMarginUSD across Categories',
    'Top 10 products ranked by total gross margin USD in descending order',
  ];

  const filteredNav = navigationCommands.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.hint.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredColumns = SCHEMA_COLUMNS.filter(col =>
    col.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    col.description.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 sm:pt-20 px-2 sm:px-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#dadad8] overflow-hidden flex flex-col z-10 max-h-[85vh] sm:max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-3 sm:px-4 py-3 border-b border-[#eeeeec] gap-2.5">
          <span className="material-symbols-outlined text-[#747878] text-[20px]">search</span>
          <input
            autoFocus
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search screens, prompts, or schema..."
            className="w-full bg-transparent text-[#1a1c1b] placeholder:text-[#747878] font-body-md text-body-md focus:outline-none"
          />
          <div className="flex items-center gap-1.5">
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-[#eeeeec] text-[#747878] rounded">ESC</kbd>
            <button
              onClick={onClose}
              className="sm:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[#747878] hover:bg-[#f4f4f2]"
              aria-label="Close search"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 divide-y divide-[#f4f4f2]">
          {/* Navigation Section */}
          <div className="py-2">
            <div className="px-3 pb-1 text-[10px] uppercase font-semibold text-[#747878] tracking-wider">
              Screens & Workspaces
            </div>
            {filteredNav.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#f4f4f2] text-left transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#747878] group-hover:text-[#1a1c1b] text-[18px]">
                    {item.icon}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md font-medium text-[#1a1c1b]">
                      {item.title}
                    </span>
                    <span className="font-body-sm text-[11px] text-[#747878]">
                      {item.hint}
                    </span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[14px] text-outline opacity-0 group-hover:opacity-100 transition-opacity">
                  arrow_forward
                </span>
              </button>
            ))}
          </div>

          {/* Quick Prompts Section */}
          <div className="py-2">
            <div className="px-3 pb-1 text-[10px] uppercase font-semibold text-[#747878] tracking-wider">
              Analytical Prompts
            </div>
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (onSelectQuery) {
                    onSelectQuery(prompt);
                  }
                  onNavigate('build-your-kpi-graph-studio');
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-[#f4f4f2] text-left transition-colors group"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="material-symbols-outlined text-[#547A9B] text-[16px]">bolt</span>
                  <span className="font-body-sm text-[12px] text-[#1a1c1b] truncate">
                    {prompt}
                  </span>
                </div>
                <span className="font-label-sm text-[10px] text-[#747878] shrink-0">Open Graph</span>
              </button>
            ))}
          </div>

          {/* Schema Columns Preview */}
          {filteredColumns.length > 0 && (
            <div className="py-2">
              <div className="px-3 pb-1 text-[10px] uppercase font-semibold text-[#747878] tracking-wider">
                HANA Schema Columns ({SCHEMA_COLUMNS.length} Available)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 px-1">
                {filteredColumns.map((col, idx) => (
                  <div 
                    key={idx}
                    className="p-2 rounded-lg bg-[#f9f9f7] border border-[#eeeeec] flex items-center justify-between"
                  >
                    <div>
                      <div className="font-label-sm font-semibold text-[#1a1c1b]">{col.name}</div>
                      <div className="text-[10px] text-[#747878]">{col.dataType}</div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 bg-[#eeeeec] rounded font-mono text-[#1a1c1b]">
                      {col.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#f9f9f7] border-t border-[#eeeeec] flex items-center justify-between text-[11px] text-[#747878]">
          <div className="flex items-center gap-2">
            <span>Use <kbd className="px-1 bg-[#eeeeec] rounded">↑</kbd> <kbd className="px-1 bg-[#eeeeec] rounded">↓</kbd> to navigate</span>
            <span>·</span>
            <span><kbd className="px-1 bg-[#eeeeec] rounded">↵</kbd> to select</span>
          </div>
          <span>SAP HANA In-Memory Column Store</span>
        </div>
      </div>
    </div>
  );
};
