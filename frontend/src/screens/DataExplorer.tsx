import React, { useState, useEffect } from 'react';
import { queryAnalytics, AnalyticsResponse } from '../services/analyticsService';
import { SCHEMA_COLUMNS } from '../data/schemaData';

interface DataExplorerProps {
  onNavigate: (path: string) => void;
}

interface HistoryItem {
  prompt: string;
  timeAgo: string;
  rows: number;
  timestamp: Date;
}

export const DataExplorer: React.FC<DataExplorerProps> = ({ onNavigate }) => {
  const [queryInput, setQueryInput] = useState('Compare NetRevenueUSD and GrossMarginUSD across Categories');
  const [activeView, setActiveView] = useState<'grid' | 'chart'>('grid');
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedSQL, setCopiedSQL] = useState(false);
  
  // Modals
  const [explainPlanModal, setExplainPlanModal] = useState(false);
  const [simulateShiftModal, setSimulateShiftModal] = useState(false);
  const [selectedRowDetail, setSelectedRowDetail] = useState<any | null>(null);
  const [historyModal, setHistoryModal] = useState(false);
  const [schemaModal, setSchemaModal] = useState(false);
  const [columnFilterModal, setColumnFilterModal] = useState(false);
  const [hanaStudioModal, setHanaStudioModal] = useState(false);
  
  // Interactive simulator state
  const [shiftVal, setShiftVal] = useState<number>(3.2);
  
  // Schema search state
  const [schemaSearch, setSchemaSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Column visibility filter state
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  
  // History state
  const [queryHistory, setQueryHistory] = useState<HistoryItem[]>([
    { prompt: 'Compare NetRevenueUSD and GrossMarginUSD across Categories', timeAgo: 'Just now', rows: 5, timestamp: new Date() },
    { prompt: 'Total NetRevenueUSD by Region and DistributionChannel', timeAgo: '12m ago', rows: 4, timestamp: new Date(Date.now() - 12 * 60000) },
    { prompt: 'Average GrossMarginPercent and Quantity by Country', timeAgo: '28m ago', rows: 5, timestamp: new Date(Date.now() - 28 * 60000) },
    { prompt: 'Top 5 Products with highest DiscountPercent and NetRevenueUSD', timeAgo: '45m ago', rows: 5, timestamp: new Date(Date.now() - 45 * 60000) },
  ]);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live backend results state
  const [liveResults, setLiveResults] = useState<AnalyticsResponse | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  const samplePrompts = [
    'Compare NetRevenueUSD and GrossMarginUSD across Categories',
    'Total NetRevenueUSD by Region and DistributionChannel',
    'Average GrossMarginPercent and Quantity by Country',
    'Top 5 Products with highest DiscountPercent and NetRevenueUSD',
  ];

  const handleRunQuery = async (overrideQuery?: string) => {
    const targetQuery = overrideQuery || queryInput;
    setIsExecuting(true);
    setQueryError(null);
    try {
      const res = await queryAnalytics(targetQuery);
      setLiveResults(res);
      
      // Update visible columns if results available
      if (res.results && res.results.length > 0) {
        setVisibleColumns(Object.keys(res.results[0]));
      }

      // Add to query history
      setQueryHistory(prev => [
        { prompt: targetQuery, timeAgo: 'Just now', rows: res.results?.length || 0, timestamp: new Date() },
        ...prev.filter(h => h.prompt !== targetQuery).slice(0, 10)
      ]);

      showToast(`Query executed — ${res.results?.length || 0} rows returned`);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Query execution failed';
      setQueryError(detail);
      showToast(`Error: ${detail}`);
    } finally {
      setIsExecuting(false);
    }
  };

  useEffect(() => {
    handleRunQuery();
  }, []);

  const handleCopySQL = () => {
    const sql = liveResults?.generated_sql ?? `SELECT T0."Category", SUM(T0."NetRevenueUSD") AS "TotalNetRevenue" FROM "NEOVATIC_DB"."SALES_FACT" T0 GROUP BY T0."Category";`;
    navigator.clipboard?.writeText(sql);
    setCopiedSQL(true);
    showToast('SQL syntax copied to clipboard');
    setTimeout(() => setCopiedSQL(false), 2000);
  };

  const exportCSV = () => {
    const results = liveResults?.results ?? [];
    if (results.length === 0) {
      showToast('No query results to export');
      return;
    }
    const colsToExport = visibleColumns.length > 0 ? visibleColumns : Object.keys(results[0]);
    const headers = colsToExport.join(',') + '\n';
    const rows = results.map(r =>
      colsToExport.map(k => {
        const val = r[k];
        return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : (val ?? '');
      }).join(',')
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HANA_TextToSQL_Export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported live query results to CSV');
  };

  // Filter schema columns for Schema Explorer Modal
  const filteredSchemaColumns = SCHEMA_COLUMNS.filter(col => {
    const matchesSearch = col.name.toLowerCase().includes(schemaSearch.toLowerCase()) || 
                          col.description.toLowerCase().includes(schemaSearch.toLowerCase()) ||
                          col.dataType.toLowerCase().includes(schemaSearch.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || col.category === selectedCategory || col.type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Dynamic Chart Helper calculation
  const getChartData = () => {
    if (!liveResults?.results || liveResults.results.length === 0) return { keys: [], dimKey: '', maxVal: 1, items: [] };
    const results = liveResults.results;
    const firstRow = results[0];
    const keys = Object.keys(firstRow);
    const dimKey = keys.find(k => typeof firstRow[k] === 'string') || keys[0];
    const numKeys = keys.filter(k => typeof firstRow[k] === 'number');
    const primaryNumKey = numKeys.find(k => k.includes('Revenue') || k.includes('MarginUSD') || k.includes('Total')) || numKeys[0] || keys[1];
    
    const maxVal = Math.max(...results.map(r => Number(r[primaryNumKey]) || 0), 1);
    
    return {
      keys,
      dimKey,
      primaryNumKey,
      numKeys,
      maxVal,
      items: results
    };
  };

  const chartData = getChartData();

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#0F172A] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 font-label-md text-label-md animate-in fade-in border border-slate-700">
          <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Operational Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-xs">
        <div className="flex flex-col gap-1 max-w-2xl">
          <div className="flex items-center gap-space-xs text-[#64748B] font-label-sm text-label-sm tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse"></span>
            <span>TEXT-TO-SQL ENGINE · SAP HANA SQL GENERATOR</span>
            <span className="text-[#CBD5E1]">•</span>
            <span className="text-[#64748B]">CATALOG V4.2</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-[#0F172A] tracking-tight font-semibold">
            Custom Text-to-SQL Analytics Explorer
          </h1>
          <p className="font-body-md text-body-md text-[#475569]">
            Query any dimension or metric across all 39 schema columns using natural language. The engine parses prompts to executable SAP HANA SQL.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap self-start md:self-end mt-2 md:mt-0">
          <button 
            onClick={() => setHistoryModal(true)}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full bg-white text-[#475569] hover:text-[#0F172A] font-label-md text-label-md hover:bg-[#F1F5F9] transition-colors shadow-2xs border border-[#CBD5E1] whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[16px] text-[#64748B]">history</span>
            <span>SQL History ({queryHistory.length})</span>
          </button>

          <button 
            onClick={exportCSV}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full bg-white text-[#475569] hover:text-[#0F172A] font-label-md text-label-md hover:bg-[#F1F5F9] transition-colors shadow-2xs border border-[#CBD5E1] whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[16px] text-[#64748B]">download</span>
            <span>Export CSV</span>
          </button>

          <button 
            onClick={() => setSchemaModal(true)}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full bg-white text-[#475569] hover:text-[#0F172A] font-label-md text-label-md hover:bg-[#F1F5F9] transition-colors shadow-2xs border border-[#CBD5E1] whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[16px] text-[#2563EB]">schema</span>
            <span>Schema Explorer (39)</span>
          </button>
        </div>
      </div>

      {/* Query Formulation Canvas */}
      <div className="w-full bg-white rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md relative overflow-hidden border border-[#E2E8F0]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-[#64748B]">
              Analytical Query Composer
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] font-label-sm text-label-sm font-medium">
              SAP HANA Columnar Optimizer
            </span>
          </div>
          <div className="flex items-center gap-space-xs text-[#64748B] font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[14px] text-[#2563EB]">bolt</span>
            <span>Target: SALES_FACT ({liveResults?.records_scanned?.toLocaleString() || '3,421,809'} records)</span>
          </div>
        </div>

        {/* Input Field */}
        <div className="relative flex flex-col md:flex-row items-stretch gap-space-xs">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-[#64748B] text-[20px] pointer-events-none">
              terminal
            </span>
            <textarea 
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleRunQuery();
                }
              }}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[#F8FAFC] text-[#0F172A] placeholder:text-[#64748B] font-body-md text-body-md focus:outline-none focus:bg-white focus:border-[#2563EB] transition-colors resize-none leading-relaxed border border-[#E2E8F0]" 
              placeholder="e.g. Compare NetRevenueUSD and GrossMarginUSD across Categories..." 
              rows={2}
            />
          </div>

          <button 
            onClick={() => handleRunQuery()}
            disabled={isExecuting}
            className="h-[58px] px-6 rounded-xl bg-[#2563EB] text-white font-label-lg text-label-lg hover:bg-[#1D4ED8] transition-all flex items-center justify-center gap-2 shadow-xs shrink-0 group disabled:opacity-70 cursor-pointer"
          >
            {isExecuting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                <span>Executing...</span>
              </>
            ) : (
              <>
                <span>Run Query</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/20 text-white font-label-sm text-label-sm tracking-widest text-[10px]">
                  CMD+ENTER
                </kbd>
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </>
            )}
          </button>
        </div>

        {/* Suggested Analytical Prompt Chips */}
        <div className="flex flex-col gap-2">
          <span className="font-label-sm text-label-sm text-[#64748B] uppercase tracking-wider font-semibold">
            Suggested Analytical Prompts
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {samplePrompts.map((promptText, idx) => (
              <button 
                key={idx}
                onClick={() => {
                  setQueryInput(promptText);
                  handleRunQuery(promptText);
                }}
                className="sample-chip text-left px-3 py-1.5 rounded-full bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#475569] hover:text-[#1D4ED8] font-label-md text-label-md transition-colors flex items-center gap-1.5 border border-[#E2E8F0] hover:border-[#BFDBFE]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"></span>
                <span>{promptText}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Execution Diagnostics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
        <div className="bg-white p-space-md rounded-xl flex items-center justify-between border border-[#E2E8F0] shadow-xs">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-[#64748B] uppercase tracking-wider">Parsing Latency</span>
            <span className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold font-mono">
              {liveResults?.parsing_latency ? `${liveResults.parsing_latency} ms` : '142 ms'}
            </span>
          </div>
          <span className="material-symbols-outlined text-[#64748B] text-[22px]">timer</span>
        </div>

        <div className="bg-white p-space-md rounded-xl flex items-center justify-between border border-[#E2E8F0] shadow-xs">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-[#64748B] uppercase tracking-wider">HANA Execution</span>
            <span className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold font-mono">
              {liveResults?.hana_latency ? `${liveResults.hana_latency} ms` : '38 ms'}
            </span>
          </div>
          <span className="material-symbols-outlined text-[#2563EB] text-[22px]">database</span>
        </div>

        <div className="bg-white p-space-md rounded-xl flex items-center justify-between border border-[#E2E8F0] shadow-xs">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-[#64748B] uppercase tracking-wider">Records Scanned</span>
            <span className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold font-mono">
              {liveResults?.records_scanned ? liveResults.records_scanned.toLocaleString() : '3,421,809'}
            </span>
          </div>
          <span className="material-symbols-outlined text-[#0D9488] text-[22px]">data_table</span>
        </div>

        <div className="bg-white p-space-md rounded-xl flex items-center justify-between border border-[#E2E8F0] shadow-xs">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-[#64748B] uppercase tracking-wider">SQL Determinism</span>
            <span className="font-headline-sm text-headline-sm text-[#16A34A] font-semibold font-mono">
              {liveResults?.sql_determinism ? `${liveResults.sql_determinism}% Match` : '99.8% Match'}
            </span>
          </div>
          <span className="material-symbols-outlined text-[#16A34A] text-[22px]">verified</span>
        </div>
      </div>

      {/* Synthesized SQL Code Block */}
      <div className="bg-[#0F172A] text-slate-100 rounded-xl overflow-hidden shadow-sm flex flex-col border border-slate-700/80">
        <div className="flex items-center justify-between px-space-lg py-3 bg-slate-800/90 backdrop-blur-sm border-b border-slate-700/80">
          <div className="flex items-center gap-space-sm flex-wrap">
            <span className="material-symbols-outlined text-[16px] text-violet-400">code</span>
            <span className="font-label-md text-label-md text-slate-200 uppercase tracking-wider font-semibold">
              Synthesized SAP HANA SQL Syntax
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-700 text-cyan-300 font-label-sm text-label-sm font-medium">
              Columnar Vector Scan
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={handleCopySQL}
              className="h-7 px-3 rounded-full bg-slate-700/70 hover:bg-slate-700 text-slate-200 font-label-sm text-label-sm transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">
                {copiedSQL ? 'check' : 'content_copy'}
              </span>
              <span>{copiedSQL ? 'Copied!' : 'Copy SQL'}</span>
            </button>

            <button 
              onClick={() => setExplainPlanModal(true)}
              className="h-7 px-3 rounded-full bg-slate-700/70 hover:bg-slate-700 text-slate-200 font-label-sm text-label-sm transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">account_tree</span>
              <span>Explain Plan</span>
            </button>

            <button 
              onClick={() => setHanaStudioModal(true)}
              className="h-7 px-3 rounded-full bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors font-label-sm text-label-sm font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">terminal</span>
              <span>Run in HANA Studio</span>
            </button>
          </div>
        </div>

        <div className="p-space-lg overflow-x-auto bg-[#090D16] font-mono text-[13px] leading-relaxed text-slate-200">
          <pre className="m-0 whitespace-pre-wrap">
            {liveResults?.generated_sql ? liveResults.generated_sql : (
              <>
                <span className="text-[#60A5FA] font-semibold">SELECT</span><br />
                {'    '}T0.<span className="text-[#CBD5E1]">"Category"</span>,<br />
                {'    '}<span className="text-[#60A5FA] font-semibold">SUM</span>(T0.<span className="text-[#CBD5E1]">"NetRevenueUSD"</span>) <span className="text-[#60A5FA] font-semibold">AS</span> <span className="text-[#CBD5E1]">"TotalNetRevenue"</span>,<br />
                {'    '}<span className="text-[#60A5FA] font-semibold">SUM</span>(T0.<span className="text-[#CBD5E1]">"GrossMarginUSD"</span>) <span className="text-[#60A5FA] font-semibold">AS</span> <span className="text-[#CBD5E1]">"TotalGrossMargin"</span>,<br />
                {'    '}<span className="text-[#60A5FA] font-semibold">ROUND</span>(<span className="text-[#60A5FA] font-semibold">AVG</span>(T0.<span className="text-[#CBD5E1]">"GrossMarginPercent"</span>), <span className="text-[#F59E0B]">2</span>) <span className="text-[#60A5FA] font-semibold">AS</span> <span className="text-[#CBD5E1]">"AvgMarginPct"</span><br />
                <span className="text-[#60A5FA] font-semibold">FROM</span> <span className="text-[#CBD5E1]">"NEOVATIC_DB"</span>.<span className="text-[#CBD5E1]">"SALES_FACT"</span> T0<br />
                <span className="text-[#60A5FA] font-semibold">GROUP BY</span> T0.<span className="text-[#CBD5E1]">"Category"</span><br />
                <span className="text-[#60A5FA] font-semibold">ORDER BY</span> <span className="text-[#CBD5E1]">"TotalNetRevenue"</span> <span className="text-[#60A5FA] font-semibold">DESC</span>;
              </>
            )}
          </pre>
        </div>
      </div>

      {/* SAP AI Core Key Takeaway Card */}
      <div className="bg-white rounded-xl p-space-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md border border-[#E2E8F0] shadow-sm">
        <div className="flex items-start gap-space-md">
          <div className="w-10 h-10 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[#7C3AED] text-[20px]">psychology</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-[#0F172A]">
                SAP AI Core Executive Takeaway
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] font-label-sm text-label-sm font-medium">
                High Confidence • 97.4%
              </span>
            </div>
            <p className="font-body-md text-body-md text-[#334155] leading-snug">
              {liveResults?.insights || liveResults?.summary_insights ? (
                <span>{liveResults.insights || liveResults.summary_insights}</span>
              ) : (
                <>
                  <strong className="text-[#0F172A]">Material Handling</strong> anchors top-line volume with <strong className="text-[#0F172A]">$58.24M</strong> in Net Revenue, yet <strong className="text-[#0F172A]">Robotics & Automation</strong> delivers structural margin efficiency at <strong className="text-[#0F172A]">38.4%</strong>. Shifting mix by 3.2% into automation workloads yields an estimated +$1.8M incremental gross margin.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-xs shrink-0 self-end md:self-center">
          <button 
            onClick={() => setSimulateShiftModal(true)}
            className="px-3.5 py-1.5 rounded-full bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE] font-label-sm text-label-sm transition-colors flex items-center gap-1 font-medium shadow-2xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">tune</span>
            <span>Simulate Shift</span>
          </button>
        </div>
      </div>

      {/* Execution Results Container */}
      <div className="w-full bg-white rounded-xl shadow-sm overflow-hidden flex flex-col border border-[#E2E8F0]">
        {/* View Switcher & Table Control Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-space-md gap-space-sm bg-white border-b border-[#E2E8F0]">
          <div className="flex items-center gap-space-sm">
            <span className="font-headline-sm text-headline-sm text-[#0F172A] font-semibold">
              Query Result Set
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569] font-label-sm text-label-sm font-medium">
              {liveResults?.results?.length || 0} Records Identified
            </span>
          </div>

          {/* Segmented Control View Toggle & Column Filter */}
          <div className="flex items-center gap-space-xs">
            <div className="flex items-center p-1 rounded-full bg-[#F1F5F9] border border-[#E2E8F0]">
              <button 
                onClick={() => setActiveView('grid')}
                className={`h-7 px-3 rounded-full font-label-sm text-label-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'grid' 
                    ? 'bg-[#2563EB] text-white shadow-xs' 
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">table_rows</span>
                <span>Data Grid View</span>
              </button>

              <button 
                onClick={() => setActiveView('chart')}
                className={`h-7 px-3 rounded-full font-label-sm text-label-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'chart' 
                    ? 'bg-[#2563EB] text-white shadow-xs' 
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">bar_chart</span>
                <span>Chart View</span>
              </button>
            </div>

            <div className="h-4 w-[1px] bg-[#E2E8F0] mx-1 hidden sm:block"></div>

            <button 
              onClick={() => setColumnFilterModal(true)}
              className="h-8 px-3 rounded-full hover:bg-[#F1F5F9] flex items-center justify-center gap-1 text-[#64748B] hover:text-[#0F172A] transition-colors border border-[#CBD5E1] text-xs font-medium cursor-pointer" 
              title="Filter result columns"
            >
              <span className="material-symbols-outlined text-[16px]">filter_list</span>
              <span>Columns ({visibleColumns.length})</span>
            </button>
          </div>
        </div>

        {/* View 1: Data Grid Canvas */}
        {activeView === 'grid' && (
          <div className="w-full overflow-x-auto scroll-touch">
            {liveResults?.results && liveResults.results.length > 0 ? (
              <table className="w-full min-w-[620px] text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] text-[#64748B] font-label-md text-label-md uppercase tracking-wider select-none border-b border-[#E2E8F0]">
                    {(visibleColumns.length > 0 ? visibleColumns : Object.keys(liveResults.results[0])).map((col) => (
                      <th key={col} className="py-3 px-space-lg font-medium text-left">
                        {col}
                      </th>
                    ))}
                    <th className="py-3 px-space-md text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-body-md font-body-md text-[#0F172A]">
                  {liveResults.results.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[#F8FAFC] transition-colors group">
                      {(visibleColumns.length > 0 ? visibleColumns : Object.keys(row)).map((colKey) => {
                        const val = row[colKey];
                        const isNum = typeof val === 'number';
                        return (
                          <td key={colKey} className={`py-3.5 px-space-lg ${isNum ? 'font-mono' : 'font-medium'}`}>
                            {isNum 
                              ? (colKey.includes('Percent') ? `${val}%` : (colKey.includes('USD') || colKey.includes('Revenue') || colKey.includes('Margin') ? `$${val.toLocaleString()}` : val.toLocaleString())) 
                              : String(val ?? '')
                            }
                          </td>
                        );
                      })}
                      <td className="py-3.5 px-space-md text-right">
                        <button
                          onClick={() => setSelectedRowDetail(row)}
                          className="h-7 w-7 rounded-full hover:bg-[#EFF6FF] inline-flex items-center justify-center text-[#64748B] hover:text-[#2563EB] transition-colors cursor-pointer"
                          title="Context drill down"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-[#64748B] font-body-md flex flex-col items-center justify-center gap-2">
                {isExecuting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[32px] text-[#2563EB]">progress_activity</span>
                    <span>Executing live query against SAP HANA engine...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[32px] text-[#94A3B8]">search_off</span>
                    <span>No query results found. Type a prompt above and click "Run Query".</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* View 2: Chart Visualization */}
        {activeView === 'chart' && (
          <div className="w-full p-space-lg flex flex-col gap-space-md animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md uppercase tracking-wider text-[#64748B] font-semibold">
                {chartData.dimKey ? `${chartData.primaryNumKey} by ${chartData.dimKey}` : 'Analytics Result Visualization'}
              </span>
              <div className="flex items-center gap-space-sm font-label-sm text-label-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#2563EB]"></span>
                  <span className="text-[#0F172A] font-medium">{chartData.primaryNumKey || 'Metric'}</span>
                </div>
              </div>
            </div>

            {/* Dynamic SVG Multi-Metric Bar Chart */}
            <div className="w-full h-72 flex items-end pt-4 pb-2">
              {chartData.items.length > 0 ? (
                <svg className="w-full h-full" fill="none" viewBox="0 0 800 240" xmlns="http://www.w3.org/2000/svg">
                  {/* Grid Horizontal Lines */}
                  <line stroke="#E2E8F0" strokeDasharray="3 3" x1="40" x2="780" y1="20" y2="20" />
                  <line stroke="#E2E8F0" strokeDasharray="3 3" x1="40" x2="780" y1="70" y2="70" />
                  <line stroke="#E2E8F0" strokeDasharray="3 3" x1="40" x2="780" y1="120" y2="120" />
                  <line stroke="#E2E8F0" strokeDasharray="3 3" x1="40" x2="780" y1="170" y2="170" />
                  <line stroke="#CBD5E1" x1="40" x2="780" y1="210" y2="210" />

                  {/* Render Dynamic SVG Bars */}
                  {chartData.items.slice(0, 6).map((item, idx) => {
                    const totalBars = Math.min(chartData.items.length, 6);
                    const slotWidth = 740 / totalBars;
                    const barWidth = Math.min(48, slotWidth * 0.5);
                    const x = 50 + idx * slotWidth + (slotWidth - barWidth) / 2;
                    const primaryKey = chartData.primaryNumKey || '';
                    const dimKey = chartData.dimKey || '';
                    const val = Number(item[primaryKey]) || 0;
                    const height = Math.max(12, Math.round((val / chartData.maxVal) * 170));
                    const y = 210 - height;
                    const label = String((dimKey && item[dimKey]) || `Item ${idx + 1}`);

                    return (
                      <g key={idx} className="group cursor-pointer">
                        <rect 
                          fill="#2563EB" 
                          height={height} 
                          rx="4" 
                          width={barWidth} 
                          x={x} 
                          y={y} 
                          className="hover:fill-[#1D4ED8] transition-colors"
                        />
                        <text 
                          className="fill-[#475569] font-mono text-[10px]" 
                          textAnchor="middle" 
                          x={x + barWidth / 2} 
                          y="228"
                        >
                          {label.length > 14 ? `${label.substring(0, 12)}...` : label}
                        </text>
                        {/* Value tag above bar */}
                        <text 
                          className="fill-[#0F172A] font-mono text-[10px] font-bold" 
                          textAnchor="middle" 
                          x={x + barWidth / 2} 
                          y={y - 6}
                        >
                          {val > 1000000 ? `$${(val / 1000000).toFixed(1)}M` : (val > 1000 ? val.toLocaleString() : val)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <div className="w-full text-center text-[#64748B] text-xs">No chart data available for visualization.</div>
              )}
            </div>
          </div>
        )}

        {/* Data Summary Footer */}
        <div className="px-space-lg py-space-sm bg-[#F8FAFC] flex flex-col sm:flex-row items-center justify-between gap-space-xs font-label-sm text-label-sm text-[#64748B] border-t border-[#E2E8F0]">
          <div className="flex items-center gap-space-md">
            <span>Aggregation: <strong className="text-[#0F172A]">SUM / AVG</strong></span>
            <span>Active Columns: <strong className="text-[#0F172A]">{visibleColumns.length}</strong></span>
            <span>HANA Partitions: <strong className="text-[#0F172A]">4 of 4 active</strong></span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[#64748B]">
            <span>Session ID: hna-tx-{Date.now().toString().slice(-5)}</span>
          </div>
        </div>
      </div>

      {/* Schema Context Quick Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        <div className="bg-white p-space-md rounded-xl shadow-xs flex flex-col gap-2 border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#64748B] font-semibold">
              Active Dimensions (22)
            </span>
            <span className="material-symbols-outlined text-[#2563EB] text-[16px]">category</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['Category', 'Region', 'Country', 'DistributionChannel', 'ProductName'].map((dim) => (
              <span key={dim} className="px-2 py-0.5 rounded bg-[#F8FAFC] text-[#0F172A] font-label-sm text-label-sm font-mono border border-[#E2E8F0]">
                {dim}
              </span>
            ))}
            <span className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] font-label-sm text-label-sm font-mono">
              +17 more
            </span>
          </div>
        </div>

        <div className="bg-white p-space-md rounded-xl shadow-xs flex flex-col gap-2 border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#64748B] font-semibold">
              Target Measures (11)
            </span>
            <span className="material-symbols-outlined text-[#0D9488] text-[16px]">calculate</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['NetRevenueUSD', 'GrossMarginUSD', 'GrossMarginPercent', 'Quantity'].map((met) => (
              <span key={met} className="px-2 py-0.5 rounded bg-[#F8FAFC] text-[#0F172A] font-label-sm text-label-sm font-mono border border-[#E2E8F0]">
                {met}
              </span>
            ))}
            <span className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] font-label-sm text-label-sm font-mono">
              +7 more
            </span>
          </div>
        </div>

        <div className="bg-white p-space-md rounded-xl shadow-xs flex flex-col gap-2 border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-[#64748B] font-semibold">
              SAP HANA AI Core Policy
            </span>
            <span className="material-symbols-outlined text-[#7C3AED] text-[16px]">policy</span>
          </div>
          <p className="font-label-md text-label-md text-[#475569] leading-snug">
            Enforcing Column Store Projection pushdown, tenant data masking on CustomerID, and deterministic ANSI SQL grammar.
          </p>
        </div>
      </div>

      {/* Row Context Drilldown Modal */}
      {selectedRowDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setSelectedRowDetail(null)} />
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 z-10 border border-[#CBD5E1]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="font-headline-sm font-semibold text-[#0F172A]">
                  Row Detail Drilldown
                </h3>
                <span className="text-xs text-[#64748B]">Partition: HDB_PRT_04 • Verified Record Context</span>
              </div>
              <button 
                onClick={() => setSelectedRowDetail(null)}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-2 font-body-sm max-h-96 overflow-y-auto">
              {Object.entries(selectedRowDetail).map(([k, v]) => (
                <div key={k} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex justify-between items-center">
                  <span className="text-[#64748B] font-medium">{k}</span>
                  <span className="font-mono font-semibold text-[#0F172A]">
                    {typeof v === 'number' ? (k.includes('Percent') ? `${v}%` : (k.includes('USD') || k.includes('Revenue') ? `$${v.toLocaleString()}` : v.toLocaleString())) : String(v)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2">
              <button 
                onClick={() => {
                  setSelectedRowDetail(null);
                  onNavigate('build-your-kpi-graph-studio');
                }}
                className="px-4 py-2 rounded-full bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE] text-xs font-medium cursor-pointer"
              >
                Open in Graph Studio
              </button>
              <button 
                onClick={() => setSelectedRowDetail(null)}
                className="px-5 py-2 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explain Plan Modal */}
      {explainPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setExplainPlanModal(false)} />
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 z-10 border border-[#CBD5E1] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#2563EB]">account_tree</span>
                <h3 className="font-headline-sm font-semibold text-[#0F172A]">SAP HANA Columnar Execution Plan</h3>
              </div>
              <button 
                onClick={() => setExplainPlanModal(false)}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3 font-mono text-xs">
              <div className="p-3 bg-[#0F172A] text-slate-100 rounded-xl space-y-1 border border-slate-700">
                <div className="text-[#22C55E] font-semibold">OPERATOR 1: COLUMN STORE AGGREGATION [Cost: 0.12]</div>
                <div className="text-slate-400">↳ Pushdown GROUP BY into L1/L2 Vector Cache</div>
                <div className="text-slate-400">↳ Parallel workers: 16 threads across NUMA Node 0/1</div>
              </div>
              <div className="p-3 bg-[#0F172A] text-slate-100 rounded-xl space-y-1 border border-slate-700">
                <div className="text-[#60A5FA] font-semibold">OPERATOR 2: HASH GROUPING & ORDER BY [Cost: 0.04]</div>
                <div className="text-slate-400">↳ Sorted by primary measure DESC ({liveResults?.results?.length || 5} output buckets)</div>
              </div>
              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] font-sans text-xs">
                Total estimated memory allocation: <strong className="text-[#0F172A]">14.2 MB</strong>. Pushdown efficiency: <strong className="text-[#16A34A]">100%</strong>.
              </div>
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] flex justify-end">
              <button 
                onClick={() => setExplainPlanModal(false)}
                className="px-5 py-2 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium cursor-pointer"
              >
                Close Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulate Shift Modal */}
      {simulateShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setSimulateShiftModal(false)} />
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 z-10 border border-[#CBD5E1]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#2563EB]">tune</span>
                <h3 className="font-headline-sm font-semibold text-[#0F172A]">AI Shift Mix Simulation</h3>
              </div>
              <button 
                onClick={() => setSimulateShiftModal(false)}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-4 font-body-sm">
              <p className="text-[#475569]">
                Adjust product workload balance to simulate gross profit margin impact based on historical price elasticity.
              </p>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#475569]">Robotics & Automation Allocation Shift</span>
                  <span className="font-mono font-semibold text-[#0F172A]">+{shiftVal}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="10" 
                  step="0.5" 
                  value={shiftVal} 
                  onChange={(e) => setShiftVal(parseFloat(e.target.value))}
                  className="w-full accent-[#2563EB] cursor-pointer" 
                />
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#64748B]">Projected Gross Profit Lift:</span>
                  <span className="font-semibold text-[#16A34A]">
                    +${(shiftVal * 0.575).toFixed(2)}M USD
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#64748B]">New Composite Margin:</span>
                  <span className="font-semibold text-[#0F172A]">
                    {(42.6 + shiftVal * 0.375).toFixed(1)}% (vs 42.6%)
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#64748B]">CAPEX Required:</span>
                  <span className="font-semibold text-[#0F172A]">$0.00 (Pure Mix Shift)</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2">
              <button 
                onClick={() => setSimulateShiftModal(false)}
                className="px-4 py-1.5 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setSimulateShiftModal(false);
                  showToast(`Simulation (+${shiftVal}%) applied to forecast models`);
                }}
                className="px-5 py-1.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium cursor-pointer"
              >
                Apply Scenario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL History Modal */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setHistoryModal(false)} />
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 z-10 border border-[#CBD5E1]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#2563EB]">history</span>
                <h3 className="font-headline-sm font-semibold text-[#0F172A]">SQL Query History ({queryHistory.length})</h3>
              </div>
              <button 
                onClick={() => setHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-3 space-y-2 max-h-80 overflow-y-auto font-body-sm">
              {queryHistory.map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    setQueryInput(item.prompt);
                    setHistoryModal(false);
                    handleRunQuery(item.prompt);
                  }}
                  className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#EFF6FF] hover:border-[#BFDBFE] cursor-pointer transition-colors"
                >
                  <div className="text-xs text-[#64748B] mb-1 flex items-center justify-between">
                    <span>Query #{queryHistory.length - idx} • {item.timeAgo}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">{item.rows} rows</span>
                  </div>
                  <div className="font-medium text-[#0F172A]">{item.prompt}</div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] flex justify-end">
              <button 
                onClick={() => setHistoryModal(false)}
                className="px-5 py-2 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schema Explorer Modal (All 39 Columns) */}
      {schemaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setSchemaModal(false)} />
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 z-10 border border-[#CBD5E1] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#2563EB]">schema</span>
                <h3 className="font-headline-sm font-semibold text-[#0F172A]">Schema Explorer (39 Columns)</h3>
              </div>
              <button 
                onClick={() => setSchemaModal(false)}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Controls: Search & Category Chips */}
            <div className="py-3 flex flex-col gap-2 border-b border-[#E2E8F0]">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#64748B] text-[18px]">search</span>
                <input 
                  type="text"
                  value={schemaSearch}
                  onChange={(e) => setSchemaSearch(e.target.value)}
                  placeholder="Search schema by column name, type, or description..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                {['All', 'Measure', 'Dimension', 'Time', 'Identifier'].map((cat) => (
                  <button 
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      selectedCategory === cat 
                        ? 'bg-[#2563EB] text-white' 
                        : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 my-3 space-y-2">
              {filteredSchemaColumns.map((col) => (
                <div 
                  key={col.name}
                  onClick={() => {
                    setQueryInput(prev => `${prev} ${col.name}`);
                    setSchemaModal(false);
                    showToast(`Inserted ${col.name}`);
                  }}
                  className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#EFF6FF] hover:border-[#BFDBFE] cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="font-semibold text-[#0F172A] flex items-center gap-2">
                      <span>{col.name}</span>
                      <span className="text-xs text-[#64748B] font-mono">({col.dataType})</span>
                    </div>
                    <div className="text-xs text-[#64748B] mt-0.5">{col.description}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                    col.type === 'Measure' ? 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]' : 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                  }`}>
                    {col.category || col.type}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] flex justify-end">
              <button 
                onClick={() => setSchemaModal(false)}
                className="px-5 py-2 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium cursor-pointer"
              >
                Close Explorer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Column Visibility Filter Modal */}
      {columnFilterModal && liveResults?.results && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setColumnFilterModal(false)} />
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10 border border-[#CBD5E1]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#2563EB]">filter_list</span>
                <h3 className="font-headline-sm font-semibold text-[#0F172A]">Result Column Filters</h3>
              </div>
              <button 
                onClick={() => setColumnFilterModal(false)}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-2 max-h-72 overflow-y-auto">
              {Object.keys(liveResults.results[0]).map((col) => {
                const isChecked = visibleColumns.includes(col);
                return (
                  <label 
                    key={col} 
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] cursor-pointer"
                  >
                    <span className="font-mono text-xs text-[#0F172A] font-medium">{col}</span>
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={(e) => {
                        if (e.target.checked) {
                          setVisibleColumns(prev => [...prev, col]);
                        } else {
                          if (visibleColumns.length > 1) {
                            setVisibleColumns(prev => prev.filter(c => c !== col));
                          } else {
                            showToast('At least one column must remain visible');
                          }
                        }
                      }}
                      className="w-4 h-4 accent-[#2563EB] cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] flex justify-between items-center">
              <button 
                onClick={() => setVisibleColumns(Object.keys(liveResults.results[0]))}
                className="text-xs text-[#2563EB] font-medium hover:underline cursor-pointer"
              >
                Reset All Columns
              </button>
              <button 
                onClick={() => setColumnFilterModal(false)}
                className="px-5 py-2 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium cursor-pointer"
              >
                Apply ({visibleColumns.length} Visible)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HANA Studio Status Modal */}
      {hanaStudioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setHanaStudioModal(false)} />
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 z-10 border border-[#CBD5E1]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#2563EB]">terminal</span>
                <h3 className="font-headline-sm font-semibold text-[#0F172A]">SAP HANA Studio Connection</h3>
              </div>
              <button 
                onClick={() => setHanaStudioModal(false)}
                className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="p-3 bg-[#0F172A] text-slate-100 rounded-xl space-y-2 border border-slate-700 font-mono">
                <div className="text-emerald-400">CONNECTING TO HOST: hana-cloud.ondemand.com:30015</div>
                <div className="text-slate-300">USER: NEOVATIC_DB_ADMIN</div>
                <div className="text-slate-400">SESSION_ID: HDB_SESS_881920X</div>
                <div className="text-cyan-300">STATUS: QUERY EXECUTION PREPARED</div>
              </div>
              <p className="text-[#475569]">
                The synthesized SQL code has been queued for execution directly on SAP HANA Cloud Column Engine.
              </p>
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] flex justify-end">
              <button 
                onClick={() => {
                  setHanaStudioModal(false);
                  showToast('HANA Studio Session Connected');
                }}
                className="px-5 py-2 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium cursor-pointer"
              >
                Open Web Studio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
