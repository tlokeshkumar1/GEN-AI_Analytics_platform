import React, { useState } from 'react';
import { SQL_QUERY_RESULTS, SCHEMA_COLUMNS } from '../data/mockData';

interface DataExplorerProps {
  onNavigate: (path: string) => void;
}

export const DataExplorer: React.FC<DataExplorerProps> = ({ onNavigate }) => {
  const [queryInput, setQueryInput] = useState('Compare NetRevenueUSD and GrossMarginUSD across Categories');
  const [activeView, setActiveView] = useState<'grid' | 'chart'>('grid');
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [explainPlanModal, setExplainPlanModal] = useState(false);
  const [simulateShiftModal, setSimulateShiftModal] = useState(false);
  const [selectedRowDetail, setSelectedRowDetail] = useState<any | null>(null);
  const [historyModal, setHistoryModal] = useState(false);
  const [schemaModal, setSchemaModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  const samplePrompts = [
    'Compare NetRevenueUSD and GrossMarginUSD across Categories',
    'Total NetRevenueUSD by Region and DistributionChannel',
    'Average GrossMarginPercent and Quantity by Country',
    'Top 5 Products with highest DiscountPercent and NetRevenueUSD',
  ];

  const handleRunQuery = () => {
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
      showToast('Query executed on SAP HANA In-Memory Engine (38ms)');
    }, 450);
  };

  const handleCopySQL = () => {
    const sql = `SELECT 
    T0."Category", 
    SUM(T0."NetRevenueUSD") AS "TotalNetRevenue", 
    SUM(T0."GrossMarginUSD") AS "TotalGrossMargin",
    ROUND(AVG(T0."GrossMarginPercent"), 2) AS "AvgMarginPct"
FROM "NEOVATIC_DB"."SALES_FACT" T0
GROUP BY T0."Category"
ORDER BY "TotalNetRevenue" DESC;`;
    navigator.clipboard?.writeText(sql);
    setCopiedSQL(true);
    showToast('SQL syntax copied to clipboard');
    setTimeout(() => setCopiedSQL(false), 2000);
  };

  const exportCSV = () => {
    const headers = 'Category,Total Net Revenue ($),Total Gross Margin ($),Avg Margin %,Attainment Index\n';
    const rows = SQL_QUERY_RESULTS.map(r => 
      `"${r.category}",${r.netRevenue},${r.grossMargin},${r.avgMarginPct}%,${r.attainment}%`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HANA_TextToSQL_Export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported query results to CSV');
  };

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#111111] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 font-label-md text-label-md animate-in fade-in">
          <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Operational Banner & Execution Context */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-xs">
        <div className="flex flex-col gap-1 max-w-2xl">
          <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            <span>TEXT-TO-SQL ENGINE · SAP HANA SQL GENERATOR</span>
            <span className="text-outline">•</span>
            <span className="text-outline">CATALOG V4.2</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
            Custom Text-to-SQL Analytics
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Query any dimension or metric across all 39 columns using natural language. The engine converts your prompt to executable SQL.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap self-start md:self-end mt-2 md:mt-0">
          <button 
            onClick={() => setHistoryModal(true)}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors shadow-sm border border-[#e2e3e1] whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[16px] text-outline">history</span>
            <span>SQL History</span>
          </button>

          <button 
            onClick={exportCSV}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors shadow-sm border border-[#e2e3e1] whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[16px] text-outline">download</span>
            <span>Export CSV</span>
          </button>

          <button 
            onClick={() => setSchemaModal(true)}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors shadow-sm border border-[#e2e3e1] whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[16px] text-outline">schema</span>
            <span>Schema Explorer</span>
          </button>
        </div>
      </div>

      {/* Prompt Formulation Canvas */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md relative overflow-hidden border border-[#eeeeec]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
              Analytical Query Composer
            </span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm">
              HANA Optimized Tokenizer
            </span>
          </div>
          <div className="flex items-center gap-space-xs text-outline font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[14px]">bolt</span>
            <span>Target: SALES_FACT (3.4M records)</span>
          </div>
        </div>

        {/* Input Field Area */}
        <div className="relative flex flex-col md:flex-row items-stretch gap-space-xs">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-outline text-[20px] pointer-events-none">
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
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none focus:bg-surface-container transition-colors resize-none leading-relaxed border border-[#eeeeec]" 
              placeholder="e.g. Compare NetRevenueUSD and GrossMarginUSD across Categories..." 
              rows={2}
            />
          </div>

          <button 
            onClick={handleRunQuery}
            disabled={isExecuting}
            className="h-[58px] px-6 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 group disabled:opacity-70"
          >
            {isExecuting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                <span>Executing...</span>
              </>
            ) : (
              <>
                <span>Run Query</span>
                <kbd className="px-1.5 py-0.5 rounded bg-surface-container-highest/20 text-on-primary font-label-sm text-label-sm tracking-widest text-[10px]">
                  CMD+ENTER
                </kbd>
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </>
            )}
          </button>
        </div>

        {/* Quick Sample Query Chips */}
        <div className="flex flex-col gap-2">
          <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
            Suggested Analytical Prompts
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {samplePrompts.map((promptText, idx) => (
              <button 
                key={idx}
                onClick={() => setQueryInput(promptText)}
                className="sample-chip text-left px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-colors flex items-center gap-1.5 border border-[#eeeeec]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
                <span>{promptText}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Execution Diagnostic Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
        <div className="bg-surface-container-lowest p-space-md rounded-xl flex items-center justify-between border border-[#eeeeec]">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Parsing Latency</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold font-mono">142 ms</span>
          </div>
          <span className="material-symbols-outlined text-outline text-[22px]">timer</span>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl flex items-center justify-between border border-[#eeeeec]">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">HANA Engine Execution</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold font-mono">38 ms</span>
          </div>
          <span className="material-symbols-outlined text-outline text-[22px]">database</span>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl flex items-center justify-between border border-[#eeeeec]">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Records Scanned</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold font-mono">3,421,809</span>
          </div>
          <span className="material-symbols-outlined text-outline text-[22px]">data_table</span>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl flex items-center justify-between border border-[#eeeeec]">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">SQL Determinism</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold font-mono">99.8% Match</span>
          </div>
          <span className="material-symbols-outlined text-outline text-[22px]">verified</span>
        </div>
      </div>

      {/* Synthesized SQL Code Block */}
      <div className="bg-primary-container text-on-primary rounded-xl overflow-hidden shadow-sm flex flex-col border border-[#2f3130]">
        <div className="flex items-center justify-between px-space-lg py-3 bg-[#2f3130]/60 backdrop-blur-sm border-b border-[#474646]">
          <div className="flex items-center gap-space-sm flex-wrap">
            <span className="material-symbols-outlined text-[16px] text-inverse-primary">code</span>
            <span className="font-label-md text-label-md text-inverse-on-surface uppercase tracking-wider font-semibold">
              Synthesized SAP HANA SQL Syntax
            </span>
            <span className="px-2 py-0.5 rounded-full bg-inverse-surface text-inverse-primary font-label-sm text-label-sm">
              Columnar Vector Scan
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={handleCopySQL}
              className="h-7 px-3 rounded-full bg-surface-container-highest/20 hover:bg-surface-container-highest/30 text-on-primary font-label-sm text-label-sm transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[13px]">
                {copiedSQL ? 'check' : 'content_copy'}
              </span>
              <span>{copiedSQL ? 'Copied!' : 'Copy SQL'}</span>
            </button>

            <button 
              onClick={() => setExplainPlanModal(true)}
              className="h-7 px-3 rounded-full bg-surface-container-highest/20 hover:bg-surface-container-highest/30 text-on-primary font-label-sm text-label-sm transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[13px]">account_tree</span>
              <span>Explain Plan</span>
            </button>

            <button 
              onClick={() => showToast('Connecting to HANA Studio Web Client session on port 30015...')}
              className="h-7 px-3 rounded-full bg-[#e5e2e1] text-[#1c1b1b] hover:bg-white transition-colors font-label-sm text-label-sm font-semibold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[13px]">terminal</span>
              <span>Run in HANA Studio</span>
            </button>
          </div>
        </div>

        <div className="p-space-lg overflow-x-auto bg-[#1c1b1b] font-mono text-[13px] leading-relaxed text-[#f1f1ef]">
          <pre className="m-0">
            <span className="text-[#6288a9] font-semibold">SELECT</span><br />
            {'    '}T0.<span className="text-[#c8c6c5]">"Category"</span>,<br />
            {'    '}<span className="text-[#6288a9] font-semibold">SUM</span>(T0.<span className="text-[#c8c6c5]">"NetRevenueUSD"</span>) <span className="text-[#6288a9] font-semibold">AS</span> <span className="text-[#c8c6c5]">"TotalNetRevenue"</span>,<br />
            {'    '}<span className="text-[#6288a9] font-semibold">SUM</span>(T0.<span className="text-[#c8c6c5]">"GrossMarginUSD"</span>) <span className="text-[#6288a9] font-semibold">AS</span> <span className="text-[#c8c6c5]">"TotalGrossMargin"</span>,<br />
            {'    '}<span className="text-[#6288a9] font-semibold">ROUND</span>(<span className="text-[#6288a9] font-semibold">AVG</span>(T0.<span className="text-[#c8c6c5]">"GrossMarginPercent"</span>), <span className="text-[#e4e2e2]">2</span>) <span className="text-[#6288a9] font-semibold">AS</span> <span className="text-[#c8c6c5]">"AvgMarginPct"</span><br />
            <span className="text-[#6288a9] font-semibold">FROM</span> <span className="text-[#c8c6c5]">"NEOVATIC_DB"</span>.<span className="text-[#c8c6c5]">"SALES_FACT"</span> T0<br />
            <span className="text-[#6288a9] font-semibold">GROUP BY</span> T0.<span className="text-[#c8c6c5]">"Category"</span><br />
            <span className="text-[#6288a9] font-semibold">ORDER BY</span> <span className="text-[#c8c6c5]">"TotalNetRevenue"</span> <span className="text-[#6288a9] font-semibold">DESC</span>;
          </pre>
        </div>
      </div>

      {/* Key Executive Intelligence Takeaway */}
      <div className="bg-surface-container-low rounded-xl p-space-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md border border-[#eeeeec]">
        <div className="flex items-start gap-space-md">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-on-primary text-[20px]">psychology</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-on-surface">
                SAP AI Core Key Takeaway
              </span>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                High Confidence • 97.4%
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface leading-snug">
              <strong>Material Handling</strong> anchors top-line volume with <strong>$58.24M</strong> in Net Revenue, yet <strong>Robotics & Automation</strong> delivers structural margin efficiency at <strong>38.4%</strong>. Shifting mix by 3.2% into automation workloads yields an estimated +$1.8M incremental gross margin without additional CAPEX.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-xs shrink-0 self-end md:self-center">
          <button 
            onClick={() => setSimulateShiftModal(true)}
            className="px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm transition-colors flex items-center gap-1 border border-[#eeeeec]"
          >
            <span className="material-symbols-outlined text-[14px]">tune</span>
            <span>Simulate Shift</span>
          </button>
        </div>
      </div>

      {/* Execution Results Container */}
      <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col border border-[#eeeeec]">
        {/* View Switcher & Table Control Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-space-md gap-space-sm bg-surface-container-lowest border-b border-[#eeeeec]">
          <div className="flex items-center gap-space-sm">
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Query Result Set
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm">
              5 Records Identified
            </span>
          </div>

          {/* Segmented Control View Toggle */}
          <div className="flex items-center gap-space-xs">
            <div className="flex items-center p-1 rounded-full bg-surface-container-low border border-[#eeeeec]">
              <button 
                onClick={() => setActiveView('grid')}
                className={`h-7 px-3 rounded-full font-label-sm text-label-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeView === 'grid' 
                    ? 'bg-primary text-on-primary shadow-sm' 
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">table_rows</span>
                <span>Data Grid View</span>
              </button>

              <button 
                onClick={() => setActiveView('chart')}
                className={`h-7 px-3 rounded-full font-label-sm text-label-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeView === 'chart' 
                    ? 'bg-primary text-on-primary shadow-sm' 
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">bar_chart</span>
                <span>Chart View</span>
              </button>
            </div>

            <div className="h-4 w-[1px] bg-surface-container-high mx-1 hidden sm:block"></div>

            <button 
              onClick={() => showToast('Column filters active (5/5 visible)')}
              className="h-8 w-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors" 
              title="Filter result columns"
            >
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
            </button>
          </div>
        </div>

        {/* View 1: Data Grid Canvas */}
        {activeView === 'grid' && (
          <div className="w-full overflow-x-auto scroll-touch">
            <table className="w-full min-w-[620px] text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md uppercase tracking-wider select-none">
                  <th className="py-3 px-space-lg font-medium text-left">Category</th>
                  <th className="py-3 px-space-lg font-medium text-right">Total Net Revenue ($)</th>
                  <th className="py-3 px-space-lg font-medium text-right">Total Gross Margin ($)</th>
                  <th className="py-3 px-space-lg font-medium text-right">Avg Margin %</th>
                  <th className="py-3 px-space-lg font-medium text-center">Attainment Index</th>
                  <th className="py-3 px-space-md text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eeeeec] text-body-md font-body-md text-on-surface">
                {SQL_QUERY_RESULTS.map((row) => (
                  <tr key={row.category} className="hover:bg-surface-container-low/70 transition-colors group">
                    <td className="py-3.5 px-space-lg font-medium">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${row.colorClass}`}></span>
                        <span>{row.category}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-space-lg text-right font-mono font-medium">
                      ${row.netRevenue.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-space-lg text-right font-mono text-on-surface-variant">
                      ${row.grossMargin.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-space-lg text-right font-mono">
                      <span className="inline-block px-2 py-0.5 rounded bg-surface-container-low text-on-surface font-medium">
                        {row.avgMarginPct}%
                      </span>
                    </td>
                    <td className="py-3.5 px-space-lg">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-24 bg-surface-container h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${row.colorClass}`} 
                            style={{ width: `${row.attainment}%` }}
                          />
                        </div>
                        <span className="font-label-sm text-label-sm font-mono text-outline">
                          {row.attainment}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-space-md text-right">
                      <button 
                        onClick={() => setSelectedRowDetail(row)}
                        className="h-7 w-7 rounded-full hover:bg-surface-container inline-flex items-center justify-center text-outline hover:text-on-surface transition-colors" 
                        title="Context drill down"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View 2: Chart Visualization */}
        {activeView === 'chart' && (
          <div className="w-full p-space-lg flex flex-col gap-space-md animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md uppercase tracking-wider text-outline">
                Net Revenue vs. Gross Margin Correlation
              </span>
              <div className="flex items-center gap-space-sm font-label-sm text-label-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-primary"></span>
                  <span className="text-on-surface">Net Revenue USD</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-secondary"></span>
                  <span className="text-on-surface">Gross Margin USD</span>
                </div>
              </div>
            </div>

            {/* SVG Analytical Multi-Metric Bar Chart */}
            <div className="w-full h-64 flex items-end">
              <svg className="w-full h-full" fill="none" viewBox="0 0 800 240" xmlns="http://www.w3.org/2000/svg">
                {/* Horizontal Guides */}
                <line className="text-surface-container" stroke="#eeeeec" strokeDasharray="3 3" x1="40" x2="780" y1="20" y2="20" />
                <line className="text-surface-container" stroke="#eeeeec" strokeDasharray="3 3" x1="40" x2="780" y1="70" y2="70" />
                <line className="text-surface-container" stroke="#eeeeec" strokeDasharray="3 3" x1="40" x2="780" y1="120" y2="120" />
                <line className="text-surface-container" stroke="#eeeeec" strokeDasharray="3 3" x1="40" x2="780" y1="170" y2="170" />
                <line className="text-surface-container-high" stroke="#dadad8" x1="40" x2="780" y1="210" y2="210" />

                {/* Category 1: Material Handling ($58.24M, $18.63M) */}
                <rect fill="#111111" height="178" rx="2" width="38" x="70" y="32" />
                <rect fill="#5e5e5e" height="58" rx="2" width="38" x="112" y="152" />
                <text className="fill-on-surface-variant font-mono text-[10px]" textAnchor="middle" x="110" y="230">Material Handling</text>

                {/* Category 2: Heavy Machinery ($46.81M, $13.57M) */}
                <rect fill="#111111" height="142" rx="2" width="38" x="220" y="68" />
                <rect fill="#5e5e5e" height="42" rx="2" width="38" x="262" y="168" />
                <text className="fill-on-surface-variant font-mono text-[10px]" textAnchor="middle" x="260" y="230">Heavy Machinery</text>

                {/* Category 3: Robotics & Automation ($41.52M, $15.94M) */}
                <rect fill="#111111" height="126" rx="2" width="38" x="370" y="84" />
                <rect fill="#5e5e5e" height="49" rx="2" width="38" x="412" y="161" />
                <text className="fill-on-surface-variant font-mono text-[10px]" textAnchor="middle" x="410" y="230">Robotics & Auto</text>

                {/* Category 4: Safety & Compliance ($22.41M, $7.84M) */}
                <rect fill="#111111" height="68" rx="2" width="38" x="520" y="142" />
                <rect fill="#5e5e5e" height="24" rx="2" width="38" x="562" y="186" />
                <text className="fill-on-surface-variant font-mono text-[10px]" textAnchor="middle" x="560" y="230">Safety & Compl.</text>

                {/* Category 5: Industrial Tools ($15.29M, $4.12M) */}
                <rect fill="#111111" height="46" rx="2" width="38" x="670" y="164" />
                <rect fill="#5e5e5e" height="13" rx="2" width="38" x="712" y="197" />
                <text className="fill-on-surface-variant font-mono text-[10px]" textAnchor="middle" x="710" y="230">Industrial Tools</text>
              </svg>
            </div>
          </div>
        )}

        {/* Data Summary Footer */}
        <div className="px-space-lg py-space-sm bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-xs font-label-sm text-label-sm text-on-surface-variant border-t border-[#eeeeec]">
          <div className="flex items-center gap-space-md">
            <span>Aggregation: <strong>SUM / AVG</strong></span>
            <span>Filter: <strong>None</strong></span>
            <span>HANA Partitions: <strong>4 of 4 active</strong></span>
          </div>
          <div className="flex items-center gap-1 font-mono text-outline">
            <span>Session ID: hna-tx-88192-0x3e</span>
          </div>
        </div>
      </div>

      {/* Schema Context Quick Drawer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-2 border border-[#eeeeec]">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
              Active Dimensions (14)
            </span>
            <span className="material-symbols-outlined text-outline text-[16px]">category</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['Category', 'Region', 'Country', 'DistributionChannel'].map((dim) => (
              <span key={dim} className="px-2 py-0.5 rounded bg-surface-container-low text-on-surface font-label-sm text-label-sm font-mono border border-[#eeeeec]">
                {dim}
              </span>
            ))}
            <span className="px-2 py-0.5 rounded bg-surface-container-low text-outline font-label-sm text-label-sm font-mono">
              +10 more
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-2 border border-[#eeeeec]">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
              Target Metrics (18)
            </span>
            <span className="material-symbols-outlined text-outline text-[16px]">calculate</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['NetRevenueUSD', 'GrossMarginUSD', 'GrossMarginPercent'].map((met) => (
              <span key={met} className="px-2 py-0.5 rounded bg-surface-container-low text-on-surface font-label-sm text-label-sm font-mono border border-[#eeeeec]">
                {met}
              </span>
            ))}
            <span className="px-2 py-0.5 rounded bg-surface-container-low text-outline font-label-sm text-label-sm font-mono">
              +15 more
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-2 border border-[#eeeeec]">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
              HANA AI Core Rule
            </span>
            <span className="material-symbols-outlined text-outline text-[16px]">policy</span>
          </div>
          <p className="font-label-md text-label-md text-on-surface-variant leading-snug">
            Enforcing Column Store Projection pushdown, tenant data masking on CustomerID, and deterministic ANSI SQL grammar.
          </p>
        </div>
      </div>

      {/* Row Drilldown Modal */}
      {selectedRowDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div 
            className="fixed inset-0" 
            onClick={() => setSelectedRowDetail(null)} 
          />
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 z-10 border border-[#dadad8]">
            <div className="flex items-center justify-between pb-3 border-b border-[#eeeeec]">
              <div>
                <h3 className="font-headline-sm font-semibold text-[#1a1c1b]">
                  {selectedRowDetail.category} Drilldown
                </h3>
                <span className="text-xs text-[#747878]">Partition ID: HDB_PRT_04 • Attainment {selectedRowDetail.attainment}%</span>
              </div>
              <button 
                onClick={() => setSelectedRowDetail(null)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3 font-body-sm">
              <div className="p-3 bg-surface-container-low rounded-xl flex justify-between items-center">
                <span className="text-outline">Total Net Revenue</span>
                <span className="font-mono font-semibold text-[#1a1c1b]">${selectedRowDetail.netRevenue.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl flex justify-between items-center">
                <span className="text-outline">Total Gross Margin</span>
                <span className="font-mono font-semibold text-[#1a1c1b]">${selectedRowDetail.grossMargin.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl flex justify-between items-center">
                <span className="text-outline">Average Margin Percentage</span>
                <span className="font-mono font-semibold text-[#1a1c1b]">{selectedRowDetail.avgMarginPct}%</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#eeeeec] flex justify-end gap-2">
              <button 
                onClick={() => {
                  setSelectedRowDetail(null);
                  onNavigate('build-your-kpi-graph-studio');
                }}
                className="px-4 py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-xs font-medium"
              >
                Open in Graph Studio
              </button>
              <button 
                onClick={() => setSelectedRowDetail(null)}
                className="px-5 py-2 rounded-full bg-primary text-white text-xs font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explain Plan Modal */}
      {explainPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div 
            className="fixed inset-0" 
            onClick={() => setExplainPlanModal(false)} 
          />
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 z-10 border border-[#dadad8] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#eeeeec]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">account_tree</span>
                <h3 className="font-headline-sm font-semibold">SAP HANA Columnar Execution Plan</h3>
              </div>
              <button 
                onClick={() => setExplainPlanModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3 font-mono text-xs">
              <div className="p-3 bg-[#1c1b1b] text-[#f1f1ef] rounded-xl space-y-1">
                <div className="text-emerald-400 font-semibold">OPERATOR 1: COLUMN STORE AGGREGATION [Cost: 0.12]</div>
                <div className="text-[#858383]">↳ Pushdown GROUP BY "Category" into L1/L2 Vector Cache</div>
                <div className="text-[#858383]">↳ Parallel workers: 16 threads across NUMA Node 0/1</div>
              </div>
              <div className="p-3 bg-[#1c1b1b] text-[#f1f1ef] rounded-xl space-y-1">
                <div className="text-blue-400 font-semibold">OPERATOR 2: HASH GROUPING & ORDER BY [Cost: 0.04]</div>
                <div className="text-[#858383]">↳ Sorted by "TotalNetRevenue" DESC (5 output buckets)</div>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl text-on-surface font-sans text-xs">
                Total estimated memory allocation: <strong>14.2 MB</strong>. Pushdown efficiency: <strong>100%</strong>.
              </div>
            </div>

            <div className="pt-3 border-t border-[#eeeeec] flex justify-end">
              <button 
                onClick={() => setExplainPlanModal(false)}
                className="px-5 py-2 rounded-full bg-primary text-white text-xs font-medium"
              >
                Close Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulate Shift Modal */}
      {simulateShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div 
            className="fixed inset-0" 
            onClick={() => setSimulateShiftModal(false)} 
          />
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 z-10 border border-[#dadad8]">
            <div className="flex items-center justify-between pb-3 border-b border-[#eeeeec]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">tune</span>
                <h3 className="font-headline-sm font-semibold">AI Shift Mix Simulation</h3>
              </div>
              <button 
                onClick={() => setSimulateShiftModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-4 font-body-sm">
              <p className="text-[#444748]">
                Adjust product workload balance to simulate gross profit margin impact based on historical price elasticity.
              </p>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Robotics & Automation Allocation Shift</span>
                  <span className="font-mono font-semibold">+3.2%</span>
                </div>
                <input type="range" min="0" max="10" step="0.5" defaultValue="3.2" className="w-full" />
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-[#eeeeec] space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-outline">Projected Gross Profit Lift:</span>
                  <span className="font-semibold text-emerald-700">+$1.84M USD</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-outline">New Composite Margin:</span>
                  <span className="font-semibold text-on-surface">43.8% (vs 42.6%)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-outline">CAPEX Required:</span>
                  <span className="font-semibold text-on-surface">$0.00 (Pure Mix Shift)</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#eeeeec] flex justify-end gap-2">
              <button 
                onClick={() => setSimulateShiftModal(false)}
                className="px-4 py-1.5 rounded-full bg-surface-container text-xs font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setSimulateShiftModal(false);
                  showToast('Simulation applied to forecast models');
                }}
                className="px-5 py-1.5 rounded-full bg-primary text-white text-xs font-medium"
              >
                Apply Scenario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL History Modal */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div 
            className="fixed inset-0" 
            onClick={() => setHistoryModal(false)} 
          />
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 z-10 border border-[#dadad8]">
            <div className="flex items-center justify-between pb-3 border-b border-[#eeeeec]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">history</span>
                <h3 className="font-headline-sm font-semibold">SQL Query History</h3>
              </div>
              <button 
                onClick={() => setHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-3 space-y-2 max-h-80 overflow-y-auto font-body-sm">
              {samplePrompts.map((p, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    setQueryInput(p);
                    setHistoryModal(false);
                    showToast('Loaded query into composer');
                  }}
                  className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors"
                >
                  <div className="text-xs text-outline mb-1">Session {idx + 1} • Executed {idx * 12 + 4}m ago</div>
                  <div className="font-medium text-on-surface">{p}</div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#eeeeec] flex justify-end">
              <button 
                onClick={() => setHistoryModal(false)}
                className="px-4 py-1.5 rounded-full bg-primary text-white text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schema Modal */}
      {schemaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div 
            className="fixed inset-0" 
            onClick={() => setSchemaModal(false)} 
          />
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 z-10 border border-[#dadad8] max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#eeeeec]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">schema</span>
                <h3 className="font-headline-sm font-semibold">Schema Explorer (39 Columns)</h3>
              </div>
              <button 
                onClick={() => setSchemaModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 my-3 space-y-2">
              {SCHEMA_COLUMNS.map((col) => (
                <div 
                  key={col.name}
                  onClick={() => {
                    setQueryInput(prev => `${prev} ${col.name}`);
                    setSchemaModal(false);
                    showToast(`Inserted ${col.name}`);
                  }}
                  className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-on-surface flex items-center gap-2">
                      <span>{col.name}</span>
                      <span className="text-xs text-outline font-mono">({col.dataType})</span>
                    </div>
                    <div className="text-xs text-outline mt-0.5">{col.description}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container text-on-surface font-mono">
                    {col.category}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#eeeeec] flex justify-end">
              <button 
                onClick={() => setSchemaModal(false)}
                className="px-5 py-2 rounded-full bg-primary text-white text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
