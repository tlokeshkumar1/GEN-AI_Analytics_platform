import React, { useState, useRef, useEffect } from 'react';

interface RAGChatProps {
  onNavigate: (path: string) => void;
}

export interface RetrievedDocument {
  id: string;
  source: string;
  snippet: string;
  relevanceScore: number;
  tableOrCollection: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  timestamp: string;
  userRole?: string;
  text?: string;
  agentMeta?: {
    latency: string;
    cosineSim: string;
    model: string;
  };
  chartData?: {
    title: string;
    unit: string;
    items: { label: string; value: number; displayValue: string }[];
  };
  riskFactors?: { title: string; desc: string }[];
  sources?: string;
  retrievedDocs?: RetrievedDocument[];
}

export interface ChatThread {
  id: string;
  title: string;
  subtitle: string;
  group: 'Today' | 'Yesterday' | 'Previous 7 Days';
  timestamp: string;
  messages: ChatMessage[];
}

export const RAGChat: React.FC<RAGChatProps> = ({ onNavigate }) => {
  // Model and input state
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchThreads, setSearchThreads] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sidebar visibility state (user collapsible)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Three-dot menu and modal states
  const [activeMenuThreadId, setActiveMenuThreadId] = useState<string | null>(null);
  const [threadToDelete, setThreadToDelete] = useState<ChatThread | null>(null);
  const [threadToRename, setThreadToRename] = useState<ChatThread | null>(null);
  const [renameTitleInput, setRenameTitleInput] = useState('');

  // Expanded document source cards per message
  const [expandedDocMessageId, setExpandedDocMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Initial Seed Threads
  const [threads, setThreads] = useState<ChatThread[]>([
    {
      id: 'thread-1',
      title: 'Margin Drilldown Germany 2024',
      subtitle: 'Gross margin across top 4 categories',
      group: 'Today',
      timestamp: '10:42 AM',
      messages: [
        {
          id: 'msg-1-1',
          sender: 'user',
          timestamp: '10:42 AM',
          userRole: 'You · Analytics Director',
          text: 'Compare gross profit margin across top 4 product categories for 2024 and provide key risk factors.',
        },
        {
          id: 'msg-1-2',
          sender: 'agent',
          timestamp: '10:42 AM',
          agentMeta: {
            latency: '0.24s',
            cosineSim: '0.942',
            model: 'Llama-3.2 11B',
          },
          text: 'Based on the latest HANA vector embeddings from the 2024 FYTD Ledger (SAP_HANA_SALES_FACT), Robotics Automation commands the highest gross profit margin at 48.2%, driven by firmware upgrade attach-rates. Heavy Machinery demonstrates margin compression down to 34.2% due to raw titanium surcharge volatility in Q2.',
          chartData: {
            title: 'Gross Profit Margin by Product Category (FY2024 Actuals)',
            unit: 'Values in % Margin',
            items: [
              { label: 'Robotics Automation', value: 48.2, displayValue: '48.2%' },
              { label: 'Material Handling Systems', value: 41.4, displayValue: '41.4%' },
              { label: 'Industrial Safety & Sensors', value: 39.8, displayValue: '39.8%' },
              { label: 'Heavy Machinery & Powertrain', value: 34.2, displayValue: '34.2%' },
            ],
          },
          riskFactors: [
            {
              title: 'Raw Material Exposure',
              desc: 'Heavy Machinery margin is vulnerable to ongoing nickel and hydraulic valve pricing in the EMEA supply chain (-180 bps YoY).',
            },
            {
              title: 'Aftermarket SaaS Growth',
              desc: 'Robotics software license renewals yielded an auxiliary contribution margin of 62%, buffering hardware delivery delays.',
            },
            {
              title: 'Freight Surcharges',
              desc: 'Material Handling trans-pacific maritime shipping added $1.2M in unbilled landed costs across Q2.',
            },
          ],
          sources: 'SAP_HANA_SALES_FACT (2,418 rows evaluated) · Vector Cosine Similarity: 0.942 · HANA Cloud Tenant us10',
          retrievedDocs: [
            {
              id: 'doc-1',
              source: 'SAP_HANA_SALES_FACT.COLUMNAR',
              tableOrCollection: 'SAP_HANA_SALES_FACT',
              snippet: 'SELECT category_name, SUM(revenue), SUM(gross_profit), AVG(margin_pct) FROM sales_fact WHERE fiscal_year = 2024 GROUP BY category_name ORDER BY margin_pct DESC',
              relevanceScore: 0.962,
              timestamp: 'Partition: FY2024_Q3_STAGING',
            },
            {
              id: 'doc-2',
              source: 'COMMODITY_SURCHARGE_INDEX_2024.PDF',
              tableOrCollection: 'V_SUPPLY_CHAIN_RISK',
              snippet: 'EMEA raw titanium and nickel surcharges rose 14.2% between April and June, reducing gross contribution margin on Heavy Machinery by 180 bps.',
              relevanceScore: 0.938,
              timestamp: 'Indexed 4h ago',
            },
            {
              id: 'doc-3',
              source: 'CRM_AFTERMARKET_RENEWALS.CSV',
              tableOrCollection: 'RECURRING_SAAS_FACT',
              snippet: 'Robotics software license renewals attach rate hit 78.4% with auxiliary contribution margin of 62.1%, buffering hardware delivery delays.',
              relevanceScore: 0.915,
              timestamp: 'Indexed yesterday',
            },
          ],
        },
      ],
    },
    {
      id: 'thread-2',
      title: 'Regional Revenue Forecast Q3',
      subtitle: 'Projection scenario with 8.4% drift',
      group: 'Today',
      timestamp: '9:15 AM',
      messages: [
        {
          id: 'msg-2-1',
          sender: 'user',
          timestamp: '9:15 AM',
          userRole: 'You · Analytics Director',
          text: 'What are the regional revenue distributions across North America, EMEA, APAC, and LATAM for the current fiscal cycle?',
        },
        {
          id: 'msg-2-2',
          sender: 'agent',
          timestamp: '9:15 AM',
          agentMeta: {
            latency: '0.19s',
            cosineSim: '0.961',
            model: 'Llama-3.2 11B',
          },
          text: 'Evaluated 3,420 regional ledger partitions in SAP HANA. North America continues to lead total volume at $82.4M (44.7% share), with EMEA growing rapidly at +18% YoY driven by enterprise industrial agreements.',
          chartData: {
            title: 'Net Revenue Distribution by Global Region',
            unit: 'Net Sales ($M)',
            items: [
              { label: 'North America', value: 44.7, displayValue: '$82.4M (44.7%)' },
              { label: 'Europe (EMEA)', value: 29.4, displayValue: '$54.1M (29.4%)' },
              { label: 'Asia-Pacific (APAC)', value: 17.8, displayValue: '$32.8M (17.8%)' },
              { label: 'Latin America (LATAM)', value: 8.1, displayValue: '$14.9M (8.1%)' },
            ],
          },
          sources: 'SAP_HANA_REGIONAL_SALES (3,420 rows evaluated) · Vector Cosine Similarity: 0.961',
          retrievedDocs: [
            {
              id: 'doc-201',
              source: 'SAP_HANA_REGIONAL_LEDGER_2025.VIEW',
              tableOrCollection: 'V_REGIONAL_CONSOLIDATION',
              snippet: 'Consolidated Net Revenue by Operating Theatre: NA $82.4M, EMEA $54.1M, APAC $32.8M, LATAM $14.9M.',
              relevanceScore: 0.971,
              timestamp: 'Partition: REGIONAL_FYTD',
            },
          ],
        },
      ],
    },
    {
      id: 'thread-3',
      title: 'Order SO-106760 Fulfillment Check',
      subtitle: 'Line-item fulfillment check & tax delta',
      group: 'Yesterday',
      timestamp: 'Yesterday',
      messages: [
        {
          id: 'msg-3-1',
          sender: 'user',
          timestamp: 'Yesterday',
          userRole: 'You · Analytics Director',
          text: 'Look up Order SO-106760 complete breakdown and tax status.',
        },
        {
          id: 'msg-3-2',
          sender: 'agent',
          timestamp: 'Yesterday',
          agentMeta: {
            latency: '0.21s',
            cosineSim: '0.975',
            model: 'Llama-3.2 11B',
          },
          text: 'Retrieved Order SO-106760 from SAP S/4HANA Sales & Distribution document flow. 3 items shipped, 1 in fulfillment staging. Realized margin is 44.2%, with automated tax compliance verified for Germany (MwSt 19%).',
          chartData: {
            title: 'Line Item Allocation for Order SO-106760',
            unit: 'Order Amount ($USD)',
            items: [
              { label: 'Item 10: X-400 Robotic Arm', value: 65, displayValue: '$240,000' },
              { label: 'Item 20: Firmware Enterprise Pack', value: 20, displayValue: '$14,500' },
              { label: 'Item 30: Proximity Sensors Matrix', value: 15, displayValue: '$9,800' },
            ],
          },
          sources: 'SAP_S4HANA_SD_ORDERS (Document SO-106760) · Vector Similarity: 0.975',
        },
      ],
    },
    {
      id: 'thread-4',
      title: 'Robotics BOM Component Variance',
      subtitle: 'Cost run on pneumatic sub-assemblies',
      group: 'Previous 7 Days',
      timestamp: 'Sep 22',
      messages: [],
    },
    {
      id: 'thread-5',
      title: 'Tier-1 Vendor Lead Time Analysis',
      subtitle: 'Average lead times by plant location',
      group: 'Previous 7 Days',
      timestamp: 'Sep 19',
      messages: [],
    },
  ]);

  const [activeThreadId, setActiveThreadId] = useState<string>('thread-1');

  // Currently active thread
  const activeThread = threads.find(t => t.id === activeThreadId) || threads[0] || null;
  const messages = activeThread?.messages || [];

  // Scroll smoothly to bottom when messages or submitting state change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSubmitting]);

  // Close menus on outside click
  useEffect(() => {
    const handleWindowClick = () => {
      setActiveMenuThreadId(null);
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  const handleSelectThread = (threadId: string) => {
    setActiveThreadId(threadId);
    setMobileDrawerOpen(false);
  };

  const handleCreateNewChat = () => {
    const newThreadId = `thread-${Date.now()}`;
    const newThread: ChatThread = {
      id: newThreadId,
      title: 'New Conversation',
      subtitle: 'Empty context',
      group: 'Today',
      timestamp: 'Just now',
      messages: [],
    };

    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newThreadId);
    setMobileDrawerOpen(false);
    setInputText('');
    showToast('Created new conversation');
    setTimeout(() => textareaRef.current?.focus(), 80);
  };

  const handleDeleteThreadConfirmed = () => {
    if (!threadToDelete) return;
    const deletedId = threadToDelete.id;
    const remaining = threads.filter(t => t.id !== deletedId);
    setThreads(remaining);

    if (activeThreadId === deletedId) {
      if (remaining.length > 0) {
        setActiveThreadId(remaining[0].id);
      } else {
        const fallbackId = `thread-${Date.now()}`;
        setThreads([
          {
            id: fallbackId,
            title: 'New Conversation',
            subtitle: 'Empty context',
            group: 'Today',
            timestamp: 'Just now',
            messages: [],
          },
        ]);
        setActiveThreadId(fallbackId);
      }
    }

    setThreadToDelete(null);
    showToast('Conversation permanently deleted');
  };

  const handleRenameThreadConfirmed = () => {
    if (!threadToRename || !renameTitleInput.trim()) return;
    setThreads(prev =>
      prev.map(t =>
        t.id === threadToRename.id
          ? { ...t, title: renameTitleInput.trim() }
          : t
      )
    );
    setThreadToRename(null);
    showToast('Conversation renamed');
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || isSubmitting) return;

    const query = inputText.trim();
    setInputText('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      userRole: 'You · Analytics Director',
      text: query,
    };

    // If active thread has default title and no messages, update title
    setThreads(prev =>
      prev.map(t => {
        if (t.id === activeThreadId) {
          const newTitle = t.title === 'New Conversation' ? query.slice(0, 32) : t.title;
          return {
            ...t,
            title: newTitle,
            subtitle: query.slice(0, 42),
            messages: [...t.messages, userMsg],
          };
        }
        return t;
      })
    );

    setIsSubmitting(true);

    // Simulate RAG vector retrieval & response generation
    setTimeout(() => {
      let responseText = '';
      let chartData: ChatMessage['chartData'] = undefined;
      let riskFactors: ChatMessage['riskFactors'] = undefined;
      let retrievedDocs: RetrievedDocument[] = [];

      const lower = query.toLowerCase();

      if (lower.includes('margin') || lower.includes('profit') || lower.includes('gross')) {
        responseText = `Retrieved in-memory partitions from SAP HANA Sales & Margin Fact table. Robotics Automation leads overall profitability at 48.2% gross margin, followed by Material Handling at 41.4%. We observe moderate pressure in Heavy Machinery (-180 bps) related to international freight and raw materials surcharges.`;
        chartData = {
          title: 'Gross Margin by Product Category (FY2024 Actuals)',
          unit: 'Margin %',
          items: [
            { label: 'Robotics Automation', value: 48.2, displayValue: '48.2%' },
            { label: 'Material Handling', value: 41.4, displayValue: '41.4%' },
            { label: 'Industrial Safety', value: 39.8, displayValue: '39.8%' },
            { label: 'Heavy Machinery', value: 34.2, displayValue: '34.2%' },
          ],
        };
        riskFactors = [
          { title: 'Material Price Exposure', desc: 'Heavy Machinery margin affected by titanium alloy surcharges in Q2.' },
          { title: 'Software Renewal Attach', desc: 'Auxiliary SaaS licenses attached to 78% of new automation shipments.' },
        ];
        retrievedDocs = [
          {
            id: 'doc-m1',
            source: 'SAP_HANA_SALES_FACT (Table Partition FY24)',
            tableOrCollection: 'SAP_HANA_SALES_FACT',
            snippet: 'Aggregate margin records: Robotics Automation revenue $68.4M with 48.2% gross margin.',
            relevanceScore: 0.964,
            timestamp: 'Partition: FY2024_Q3',
          },
          {
            id: 'doc-m2',
            source: 'SUPPLY_CHAIN_COMMODITY_SURCHARGE.PDF',
            tableOrCollection: 'V_SUPPLY_CHAIN_RISK',
            snippet: 'Titanium and hydraulic component price variance index tracked at +14.2% YoY across EMEA manufacturing hubs.',
            relevanceScore: 0.928,
            timestamp: 'Updated 6h ago',
          },
        ];
      } else if (lower.includes('region') || lower.includes('country') || lower.includes('north america') || lower.includes('europe')) {
        responseText = `Evaluated 3,420 regional ledger partitions in SAP HANA. North America continues to lead total volume at $82.4M (44.7% share), with EMEA growing rapidly at +18% YoY driven by enterprise industrial agreements.`;
        chartData = {
          title: 'Net Revenue Distribution by Global Region',
          unit: 'Allocation %',
          items: [
            { label: 'North America', value: 44.7, displayValue: '$82.4M (44.7%)' },
            { label: 'Europe (EMEA)', value: 29.4, displayValue: '$54.1M (29.4%)' },
            { label: 'Asia-Pacific', value: 17.8, displayValue: '$32.8M (17.8%)' },
            { label: 'Latin America', value: 8.1, displayValue: '$14.9M (8.1%)' },
          ],
        };
        retrievedDocs = [
          {
            id: 'doc-r1',
            source: 'SAP_HANA_REGIONAL_SALES_VIEW',
            tableOrCollection: 'V_REGIONAL_CONSOLIDATION',
            snippet: 'Total Net Revenue FYTD 2025: NA $82.4M (44.7%), EMEA $54.1M (29.4%), APAC $32.8M (17.8%), LATAM $14.9M (8.1%).',
            relevanceScore: 0.958,
            timestamp: 'Ledger: FY25_ACTUALS',
          },
        ];
      } else if (lower.includes('order') || lower.includes('so-')) {
        responseText = `Retrieved Order SO-106760 from SAP S/4HANA Sales & Distribution document flow. 3 items shipped, 1 in fulfillment staging. Realized margin: 44.2%, with automated tax compliance verified for Germany.`;
        chartData = {
          title: 'Line Item Breakdown for Order SO-106760',
          unit: 'Item Value ($USD)',
          items: [
            { label: 'Item 10: X-400 Robotic Arm', value: 50, displayValue: '$240,000' },
            { label: 'Item 20: Firmware Enterprise Pack', value: 30, displayValue: '$14,500' },
            { label: 'Item 30: Sensors Matrix', value: 20, displayValue: '$9,800' },
          ],
        };
        retrievedDocs = [
          {
            id: 'doc-o1',
            source: 'SAP_S4HANA_SD_DOCUMENTS',
            tableOrCollection: 'VBAK_VBAP_FLOW',
            snippet: 'Sales Order SO-106760: Total gross amount $264,300. Status: Partial delivery (85% completed). Customer: Siemens AG.',
            relevanceScore: 0.982,
            timestamp: 'Sync: 5m ago',
          },
        ];
      } else {
        responseText = `Grounded query against 3,248 HANA vector embeddings. Net Revenue run-rate is pacing at $184.2M with average profit margin of 42.6%. The ledger reveals consistent outperformance in high-margin automated robotics and sensors, with enterprise fulfillment efficiency at 96.4%.`;
        chartData = {
          title: `Analytical Synthesis for: "${query.slice(0, 32)}..."`,
          unit: 'Allocation %',
          items: [
            { label: 'North America', value: 45, displayValue: '$82.4M (45%)' },
            { label: 'Europe (EMEA)', value: 30, displayValue: '$54.1M (30%)' },
            { label: 'Asia-Pacific', value: 18, displayValue: '$32.8M (18%)' },
            { label: 'Other Markets', value: 7, displayValue: '$14.9M (7%)' },
          ],
        };
        riskFactors = [
          {
            title: 'HANA Memory Grounding',
            desc: 'Validated against SAP HANA In-Memory columnar cache with zero latency drift.',
          },
          {
            title: 'Planning Tolerance',
            desc: 'Observed metric variance is within ±1.2% allowable fiscal planning tolerances.',
          },
        ];
        retrievedDocs = [
          {
            id: 'doc-g1',
            source: 'SAP_HANA_SALES_FACT (Consolidated Ledger)',
            tableOrCollection: 'SAP_HANA_SALES_FACT',
            snippet: 'Evaluated 3,248 vector chunks. FYTD Total Net Revenue $184.2M, Gross Profit $78.5M, Gross Margin 42.6%.',
            relevanceScore: 0.948,
            timestamp: 'Indexed: Today 10:00 AM',
          },
        ];
      }

      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentMeta: {
          latency: '0.22s',
          cosineSim: '0.952',
          model: 'Llama-3.2 11B',
        },
        text: responseText,
        chartData,
        riskFactors,
        sources: `SAP_HANA_SALES_FACT (${retrievedDocs.length * 1240} rows evaluated) · Vector Cosine Similarity: 0.952 · HANA Cloud Tenant us10`,
        retrievedDocs,
      };

      setThreads(prev =>
        prev.map(t => {
          if (t.id === activeThreadId) {
            return {
              ...t,
              messages: [...t.messages, agentMsg],
            };
          }
          return t;
        })
      );

      setIsSubmitting(false);
    }, 600);
  };

  const handleSuggestedPrompt = (promptText: string) => {
    setInputText(promptText);
    textareaRef.current?.focus();
  };

  const handleExportMarkdown = (thread: ChatThread) => {
    const transcript = thread.messages
      .map(m => {
        if (m.sender === 'user') {
          return `### ${m.userRole || 'User'} (${m.timestamp})\n\n${m.text}\n`;
        } else {
          return `### NEOVATIC RAG Assistant (${m.timestamp})\n*Model: ${m.agentMeta?.model || 'Llama-3.2'} | Latency: ${m.agentMeta?.latency || '0.2s'} | Cosine: ${m.agentMeta?.cosineSim || '0.95'}*\n\n${m.text}\n\n**Sources:** ${m.sources || 'SAP HANA Vector Store'}\n`;
        }
      })
      .join('\n---\n\n');

    const blob = new Blob([`# ${thread.title}\n\n${transcript}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${thread.title.replace(/[^a-zA-Z0-9]/g, '_')}_Transcript.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Conversation exported as Markdown');
  };

  const filteredThreads = threads.filter(
    t =>
      t.title.toLowerCase().includes(searchThreads.toLowerCase()) ||
      t.subtitle.toLowerCase().includes(searchThreads.toLowerCase())
  );

  const groups: ('Today' | 'Yesterday' | 'Previous 7 Days')[] = ['Today', 'Yesterday', 'Previous 7 Days'];

  // Helper to format assistant message content cleanly (handling code blocks & linebreaks)
  const renderFormattedText = (text: string) => {
    if (text.includes('```')) {
      const parts = text.split(/(```[\s\S]*?```)/g);
      return parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const lang = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : '';
          const code = (lang ? lines.slice(1) : lines).join('\n');
          return (
            <div key={i} className="my-2 rounded-xl bg-[#0F172A] text-slate-100 p-3.5 font-mono text-xs overflow-x-auto relative group shadow-sm border border-slate-700/60">
              <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1.5 mb-2 border-b border-slate-700/80">
                <span className="uppercase tracking-wider font-semibold text-violet-400">{lang || 'SQL Query'}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(code);
                    showToast('Snippet copied to clipboard');
                  }}
                  className="hover:text-white flex items-center gap-1 transition-colors text-slate-300"
                >
                  <span className="material-symbols-outlined text-[13px]">content_copy</span>
                  <span>Copy</span>
                </button>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed text-slate-200">{code}</pre>
            </div>
          );
        }
        return <p key={i} className="whitespace-pre-line leading-relaxed font-body-md text-[#0F172A]">{part}</p>;
      });
    }
    return <p className="whitespace-pre-line leading-relaxed font-body-md text-[#0F172A]">{text}</p>;
  };

  return (
    <div className="flex w-full h-full overflow-hidden rounded-2xl bg-white border border-[#E2E8F0] shadow-sm relative select-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 bg-[#0F172A] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 font-label-md text-label-md animate-in fade-in slide-in-from-top-2 border border-slate-700/60">
          <span className="material-symbols-outlined text-[17px] text-[#22C55E]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {threadToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div 
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#CBD5E1] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0 border border-[#FECACA]">
                <span className="material-symbols-outlined text-[22px]">delete_forever</span>
              </div>
              <div className="flex flex-col">
                <h3 className="font-headline-sm text-[#0F172A] font-semibold">Delete Conversation?</h3>
                <p className="text-body-sm text-[#475569] mt-1 leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-[#0F172A]">"{threadToDelete.title}"</strong>? This will remove all prompt history, retrieved vectors, and charts in this session.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setThreadToDelete(null)}
                className="px-4 py-2 rounded-xl text-body-sm font-medium text-[#475569] hover:bg-[#F1F5F9] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteThreadConfirmed}
                className="px-4 py-2 rounded-xl text-body-sm font-medium bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Delete Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Conversation Modal */}
      {threadToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div 
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#CBD5E1] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[20px] text-[#2563EB]">edit</span>
              <h3 className="font-headline-sm text-[#0F172A] font-semibold">Rename Conversation</h3>
            </div>
            <p className="text-body-sm text-[#475569] mb-3">
              Enter a concise descriptive title for this session thread.
            </p>
            <input
              type="text"
              value={renameTitleInput}
              onChange={(e) => setRenameTitleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameThreadConfirmed();
                if (e.key === 'Escape') setThreadToRename(null);
              }}
              className="w-full h-10 px-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] font-body-md focus:outline-none focus:border-[#2563EB] mb-4"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setThreadToRename(null)}
                className="px-4 py-2 rounded-xl text-body-sm font-medium text-[#475569] hover:bg-[#F1F5F9] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenameThreadConfirmed}
                className="px-4 py-2 rounded-xl text-body-sm font-medium bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer Overlay */}
      {mobileDrawerOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* ============================================================ */}
      {/* 1. LEFT COLUMN: Collapsible Chat History Sidebar */}
      {/* ============================================================ */}
      <aside
        className={`
          ${sidebarCollapsed ? 'lg:w-0 lg:border-r-0 lg:p-0 lg:opacity-0' : 'lg:w-[270px] xl:w-[290px] lg:border-r lg:p-3 lg:opacity-100'}
          ${mobileDrawerOpen ? 'translate-x-0 w-[280px] p-3 border-r shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          fixed lg:static inset-y-0 left-0 z-50 lg:z-auto bg-[#F8FAFC] border-[#E2E8F0] flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 overflow-hidden h-full
        `}
      >
        <div className="flex flex-col h-full min-w-[245px] overflow-hidden">
          {/* Top Actions: New Chat & Collapse */}
          <div className="flex items-center gap-2 mb-2.5 shrink-0">
            <button
              type="button"
              onClick={handleCreateNewChat}
              className="flex-1 h-9 px-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-label-md text-label-md font-medium flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New Chat</span>
            </button>

            {/* Collapse toggle (desktop collapses sidebar; mobile closes drawer) */}
            <button
              onClick={() => {
                setMobileDrawerOpen(false);
                setSidebarCollapsed(true);
              }}
              title="Collapse history sidebar"
              className="w-9 h-9 rounded-xl bg-white hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] flex items-center justify-center transition-colors shrink-0 shadow-2xs"
              aria-label="Collapse history sidebar"
            >
              <span className="material-symbols-outlined text-[18px]">left_panel_close</span>
            </button>
          </div>

          {/* Quick Search Input */}
          <div className="relative mb-2.5 shrink-0">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-[#64748B] text-[16px] pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchThreads}
              onChange={(e) => setSearchThreads(e.target.value)}
              placeholder="Search chat history..."
              className="w-full h-8 pl-8 pr-7 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#7C3AED] transition-colors"
            />
            {searchThreads && (
              <button
                onClick={() => setSearchThreads('')}
                className="absolute right-2 top-1.5 text-[#64748B] hover:text-[#0F172A]"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>

          {/* Controlled Scrollable Thread List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 select-none scroll-touch min-h-0">
            {filteredThreads.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                No conversations found
              </div>
            ) : (
              groups.map(group => {
                const groupThreads = filteredThreads.filter(t => t.group === group);
                if (groupThreads.length === 0) return null;

                return (
                  <div key={group} className="space-y-1">
                    <div className="px-2 text-[10px] uppercase font-semibold text-[#64748B] tracking-wider mb-1">
                      {group}
                    </div>

                    {groupThreads.map(thread => {
                      const isActive = thread.id === activeThreadId;
                      const isMenuOpen = activeMenuThreadId === thread.id;

                      return (
                        <div
                          key={thread.id}
                          className={`group relative flex items-center justify-between rounded-xl px-2.5 py-2 transition-all cursor-pointer ${
                            isActive
                              ? 'bg-white border border-[#CBD5E1] shadow-xs text-[#0F172A]'
                              : 'hover:bg-white text-[#475569] border border-transparent'
                          }`}
                          onClick={() => handleSelectThread(thread.id)}
                        >
                          {/* Active Indicator Bar */}
                          {isActive && (
                            <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#7C3AED] rounded-r" />
                          )}

                          {/* Thread Title & Subtitle */}
                          <div className="flex flex-col min-w-0 pr-1 pl-1 flex-1">
                            <span className={`text-xs truncate ${isActive ? 'font-semibold text-[#0F172A]' : 'font-medium group-hover:text-[#0F172A]'}`}>
                              {thread.title}
                            </span>
                            <span className="text-[11px] text-[#64748B] truncate mt-0.5">
                              {thread.subtitle || 'Empty session'}
                            </span>
                          </div>

                          {/* Three-Dot Menu Action Button (Reveals on Hover) */}
                          <div
                            className="relative shrink-0 ml-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuThreadId(isMenuOpen ? null : thread.id);
                              }}
                              title="Chat options"
                              aria-label="Chat options"
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] ${
                                isMenuOpen ? 'opacity-100 bg-[#F1F5F9] text-[#0F172A]' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[17px]">more_vert</span>
                            </button>

                            {/* Three-dot Dropdown Menu */}
                            {isMenuOpen && (
                              <div
                                className="absolute right-0 top-8 w-44 rounded-xl bg-white border border-[#E2E8F0] shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 text-left"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Rename Action */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuThreadId(null);
                                    setThreadToRename(thread);
                                    setRenameTitleInput(thread.title);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-[#0F172A] hover:bg-[#F1F5F9] flex items-center gap-2 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[16px] text-[#64748B]">edit</span>
                                  <span>Rename</span>
                                </button>

                                {/* Export Action */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuThreadId(null);
                                    handleExportMarkdown(thread);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-[#0F172A] hover:bg-[#F1F5F9] flex items-center gap-2 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[16px] text-[#64748B]">download</span>
                                  <span>Export MD</span>
                                </button>

                                <div className="my-1 border-t border-[#E2E8F0]" />

                                {/* Delete Chat Action */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuThreadId(null);
                                    setThreadToDelete(thread);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-[#DC2626] hover:bg-[#FEF2F2] flex items-center gap-2 transition-colors font-medium"
                                >
                                  <span className="material-symbols-outlined text-[16px] text-[#DC2626]">delete</span>
                                  <span>Delete Chat</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer: HANA Memory Health Summary */}
          <div className="pt-2.5 mt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B] shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
              <span className="font-mono text-[#0F172A]">3,248 Docs</span>
            </div>
            <span className="font-mono text-[10px] text-[#64748B]">HANA Vector 4.2</span>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. RIGHT COLUMN: Main Chat Application Container */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white overflow-hidden">
        {/* ============================================================ */}
        {/* CHAT HEADER: Persistent, Stable Top Control Bar */}
        {/* ============================================================ */}
        <header className="h-[54px] sm:h-[58px] border-b border-[#E2E8F0] px-3 sm:px-4 flex items-center justify-between bg-white shrink-0 z-10 gap-2 sm:gap-3 w-full">
          {/* Left: Sidebar Toggle Button + Auto-truncating Active Session Title with Dots */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 overflow-hidden mr-2">
            {/* Sidebar Toggle Button */}
            <button
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileDrawerOpen(prev => !prev);
                } else {
                  setSidebarCollapsed(prev => !prev);
                }
              }}
              title={sidebarCollapsed ? "Open chat history" : "Collapse chat history"}
              className="w-8.5 h-8.5 rounded-full flex items-center justify-center text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors border border-[#E2E8F0] bg-white shrink-0 shadow-2xs"
              aria-label="Toggle chat history sidebar"
            >
              <span className="material-symbols-outlined text-[19px]">
                {sidebarCollapsed ? 'dock_to_left' : 'left_panel_close'}
              </span>
            </button>

            {/* Active Thread Title & Metadata */}
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                <h2 
                  title={activeThread?.title || 'Conversational Analytics'}
                  className={`font-headline-sm text-xs sm:text-sm text-[#0F172A] font-semibold truncate block leading-tight min-w-0 ${
                    !sidebarCollapsed 
                      ? 'max-w-[110px] xs:max-w-[150px] sm:max-w-[200px] md:max-w-[240px] lg:max-w-[280px]' 
                      : 'max-w-xs sm:max-w-md'
                  }`}
                >
                  {activeThread?.title || 'Conversational Analytics'}
                </h2>
                {sidebarCollapsed && (
                  <span className="hidden xl:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] text-[10px] font-medium border border-[#BBF7D0] shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"></span>
                    <span>HANA Vector Synced</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#64748B] truncate leading-tight mt-0.5 min-w-0">
                <span>us10-prod</span>
                <span aria-hidden="true">·</span>
                <span>{messages.length} msgs</span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span className="hidden sm:inline">{activeThread?.timestamp || 'Active'}</span>
              </div>
            </div>
          </div>

          {/* Right: Header Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            {/* Export MD */}
            {activeThread && (
              <button
                onClick={() => handleExportMarkdown(activeThread)}
                title="Export thread as Markdown transcript"
                className="h-8.5 px-3 rounded-full bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[15px] text-[#64748B]">download</span>
                <span>Export</span>
              </button>
            )}

            {/* Clear Context */}
            <button
              onClick={() => {
                if (activeThread) {
                  setThreads(prev =>
                    prev.map(t => (t.id === activeThread.id ? { ...t, messages: [] } : t))
                  );
                  showToast('Context cleared for this session');
                }
              }}
              title="Clear all messages in active session"
              className="h-8.5 px-3 rounded-full bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[15px] text-[#64748B]">restart_alt</span>
              <span>Clear</span>
            </button>

            {/* Jump to Graph Studio */}
            <button
              onClick={() => onNavigate('build-your-kpi-graph-studio')}
              title="Open Graph Studio for custom KPI charts"
              className="h-8.5 px-3 rounded-full bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE] text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[15px] text-[#2563EB]">insert_chart</span>
              <span>Graph Studio</span>
            </button>
          </div>
        </header>

        {/* ============================================================ */}
        {/* CHAT CONVERSATION AREA: The Primary Scrollable Region */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 space-y-6 scroll-touch min-h-0 bg-[#F8FAFC]/50">
          {messages.length === 0 ? (
            /* ============================================================ */
            /* Empty State: Clean Welcome & Suggested Prompt Starters */
            /* ============================================================ */
            <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center px-4 py-6">
              <div className="w-13 h-13 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center text-[#7C3AED] mb-3.5 shadow-sm">
                <span className="material-symbols-outlined text-[26px]">smart_toy</span>
              </div>
              <h3 className="font-headline-md text-lg sm:text-[20px] text-[#0F172A] font-semibold">
                How can I assist your enterprise analytics?
              </h3>
              <p className="text-body-sm text-[#475569] mt-1.5 mb-5 max-w-md leading-relaxed">
                Ask questions about sales ledgers, gross margins, SKU variances, regional distributions, or request custom visualization graphs.
              </p>

              {/* Suggested prompt starter cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                {[
                  {
                    icon: 'bar_chart',
                    color: 'text-[#2563EB]',
                    title: 'Gross Margin by Category',
                    query: 'Compare gross profit margin across top 4 product categories for 2024 and provide key risk factors.',
                  },
                  {
                    icon: 'public',
                    color: 'text-[#0D9488]',
                    title: 'Regional Revenue Share',
                    query: 'What are the regional revenue distributions across North America, EMEA, APAC, and LATAM?',
                  },
                  {
                    icon: 'receipt_long',
                    color: 'text-[#4F46E5]',
                    title: 'Order Fulfillment Lookup',
                    query: 'Look up Order SO-106760 complete breakdown and tax status.',
                  },
                  {
                    icon: 'trending_up',
                    color: 'text-[#7C3AED]',
                    title: '2025 Margin Projections',
                    query: 'Provide 2025 revenue projections with continuous vector-grounded context.',
                  },
                ].map((card, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestedPrompt(card.query)}
                    className="p-3 rounded-xl bg-white hover:bg-[#F1F5F9] border border-[#E2E8F0] text-left transition-all group flex flex-col justify-between shadow-2xs hover:border-[#CBD5E1]"
                  >
                    <div className="flex items-center gap-2 text-[#0F172A] mb-1 font-semibold text-xs">
                      <span className={`material-symbols-outlined text-[17px] ${card.color} transition-colors`}>
                        {card.icon}
                      </span>
                      <span>{card.title}</span>
                    </div>
                    <span className="text-[11px] text-[#64748B] line-clamp-2 leading-relaxed">
                      {card.query}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* Message Stream: Distinct User & Assistant Bubbles */
            /* ============================================================ */
            messages.map((msg) => {
              if (msg.sender === 'user') {
                return (
                  /* User Message Bubble (Right-aligned) */
                  <div key={msg.id} className="flex justify-end items-start gap-2.5 max-w-2xl ml-auto">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2 mb-1 text-[11px] text-[#64748B]">
                        <span>{msg.userRole || 'You'}</span>
                        <span aria-hidden="true">·</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div className="bg-[#0F172A] text-white px-4 py-2.5 rounded-2xl rounded-tr-xs shadow-sm font-body-md text-sm leading-relaxed break-words">
                        {msg.text}
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#E2E8F0] text-[#0F172A] flex items-center justify-center text-xs font-semibold shrink-0 mt-3.5 shadow-2xs border border-[#CBD5E1]">
                      AD
                    </div>
                  </div>
                );
              }

              /* Assistant Message Bubble (Left-aligned) */
              const areDocsExpanded = expandedDocMessageId === msg.id;

              return (
                <div key={msg.id} className="flex items-start gap-3 max-w-4xl mr-auto">
                  {/* Assistant Avatar */}
                  <div className="w-8 h-8 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  </div>

                  <div className="flex-1 flex flex-col space-y-2.5 min-w-0">
                    {/* Assistant Header & Model Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#0F172A]">
                          NEOVATIC Assistant
                        </span>
                        <span className="text-[11px] text-[#7C3AED] font-medium px-2 py-0.5 rounded-full bg-[#F5F3FF] border border-[#DDD6FE]">
                          {msg.agentMeta?.model || 'Llama-3.2 11B'}
                        </span>
                        <span aria-hidden="true" className="text-[#CBD5E1]">·</span>
                        <span className="text-[11px] text-[#64748B] font-mono">
                          {msg.agentMeta?.latency || '0.2s'}
                        </span>
                      </div>

                      {/* Grounding Confidence Score */}
                      {msg.agentMeta?.cosineSim && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded-full border border-[#BBF7D0]">
                          <span className="material-symbols-outlined text-[13px] text-[#16A34A]">verified</span>
                          <span>Similarity {msg.agentMeta.cosineSim}</span>
                        </div>
                      )}
                    </div>

                    {/* Assistant Response Content Card */}
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl rounded-tl-xs p-4 sm:p-5 text-[#0F172A] text-sm leading-relaxed shadow-xs space-y-4">
                      {/* Render text with code block parsing */}
                      {msg.text && renderFormattedText(msg.text)}

                      {/* Inline Analytical Chart Visualization (if present) */}
                      {msg.chartData && (
                        <div className="bg-[#F8FAFC] rounded-xl p-3.5 sm:p-4 border border-[#E2E8F0] shadow-2xs space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-label-md text-xs font-semibold text-[#0F172A]">
                              <span className="material-symbols-outlined text-[16px] text-[#2563EB]">bar_chart</span>
                              <span>{msg.chartData.title}</span>
                            </div>
                            <span className="text-[11px] text-[#64748B] font-mono">
                              {msg.chartData.unit}
                            </span>
                          </div>

                          <div className="space-y-2.5 pt-1">
                            {msg.chartData.items.map((item, idx) => {
                              const barColors = ['bg-[#7C3AED]', 'bg-[#2563EB]', 'bg-[#0D9488]', 'bg-[#4F46E5]'];
                              const chosenColor = barColors[idx % barColors.length];
                              return (
                                <div key={idx} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-[#334155] font-medium truncate mr-2">
                                      {item.label}
                                    </span>
                                    <span className="font-semibold text-[#0F172A] font-mono shrink-0">
                                      {item.displayValue}
                                    </span>
                                  </div>
                                  <div className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${chosenColor} transition-all duration-500`}
                                      style={{ width: `${Math.min(item.value, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Risk Factors / Variances */}
                      {msg.riskFactors && msg.riskFactors.length > 0 && (
                        <div className="bg-[#FEF3C7]/60 border border-[#FDE68A] rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#92400E]">
                            <span className="material-symbols-outlined text-[16px] text-[#D97706]">warning</span>
                            <span>Identified Variance Factors</span>
                          </div>
                          <ul className="space-y-1.5 text-xs text-[#78350F] pl-5 list-disc">
                            {msg.riskFactors.map((rf, idx) => (
                              <li key={idx}>
                                <strong>{rf.title}:</strong> {rf.desc}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Retrieved Documents & Grounding Accordion */}
                      {msg.retrievedDocs && msg.retrievedDocs.length > 0 && (
                        <div className="pt-2 border-t border-[#E2E8F0]">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDocMessageId(areDocsExpanded ? null : msg.id)
                            }
                            className="w-full flex items-center justify-between p-2 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-medium text-[#475569] transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[16px] text-[#7C3AED]">source</span>
                              <span>Retrieved Vector Sources ({msg.retrievedDocs.length} Chunks)</span>
                            </div>
                            <span className="material-symbols-outlined text-[18px] text-[#64748B]">
                              {areDocsExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>

                          {areDocsExpanded && (
                            <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1">
                              {msg.retrievedDocs.map((doc) => (
                                <div
                                  key={doc.id}
                                  className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5 text-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-[#0F172A] font-mono text-[11px] truncate">
                                      {doc.source}
                                    </span>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                                      Sim: {doc.relevanceScore}
                                    </span>
                                  </div>
                                  <p className="text-[#334155] font-mono text-[11px] bg-white p-2 rounded-lg border border-[#E2E8F0] leading-relaxed break-words">
                                    {doc.snippet}
                                  </p>
                                  <div className="text-[10px] text-[#64748B]">
                                    Partition / Index: {doc.timestamp}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Assistant Actions Bar */}
                    <div className="flex items-center gap-1 text-xs text-[#64748B]">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(msg.text || '');
                          showToast('Copied answer to clipboard');
                        }}
                        className="px-2.5 py-1 rounded-lg hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A] flex items-center gap-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">content_copy</span>
                        <span>Copy</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onNavigate('build-your-kpi-graph-studio')}
                        className="px-2.5 py-1 rounded-lg hover:bg-[#EFF6FF] text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">query_stats</span>
                        <span>Open in Studio</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => showToast('Insight pinned to Executive Dashboard')}
                        className="px-2.5 py-1 rounded-lg hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A] flex items-center gap-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">push_pin</span>
                        <span>Pin</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Submitting / Retrieving State */}
          {isSubmitting && (
            <div className="flex items-start gap-3 max-w-2xl mr-auto animate-in fade-in">
              <div className="w-8 h-8 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              </div>
              <div className="bg-[#F5F3FF] border border-[#DDD6FE] rounded-2xl rounded-tl-xs p-3.5 sm:p-4 text-xs text-[#5B21B6] space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 font-medium text-[#5B21B6]">
                  <span className="material-symbols-outlined text-[18px] animate-spin text-[#7C3AED]">
                    progress_activity
                  </span>
                  <span>Retrieving context from SAP HANA in-memory vector store...</span>
                </div>
                <div className="flex items-center gap-2 text-[#6D28D9] pl-6 text-[11px]">
                  <span>Cosine Match Score &gt; 0.90</span>
                  <span aria-hidden="true">·</span>
                  <span>Evaluating 3,248 partitions</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ============================================================ */}
        {/* CHAT INPUT AREA: Sticky / Docked at Bottom of Chat Panel */}
        {/* ============================================================ */}
        <div className="p-3 sm:p-4 bg-white border-t border-[#E2E8F0] shrink-0 z-10">
          <div className="max-w-4xl mx-auto rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] focus-within:border-[#7C3AED] focus-within:ring-2 focus-within:ring-[#7C3AED]/20 focus-within:bg-white transition-all p-2.5 sm:p-3 space-y-2">
            {/* Multiline Textarea */}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask about sales, gross margins, SKU variances, or request a custom chart..."
              rows={2}
              className="w-full bg-transparent resize-none text-sm text-[#0F172A] placeholder:text-[#64748B] focus:outline-none leading-relaxed max-h-36 overflow-y-auto"
            />

            {/* Input Toolbar */}
            <div className="flex items-center justify-between pt-1.5 border-t border-[#E2E8F0] gap-2">
              <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
                <span>SAP HANA In-Memory RAG</span>
              </div>

              {/* Right: Send Button & Keyboard indicator */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline text-[11px] text-[#64748B] font-mono select-none">
                  Enter ↵ to send
                </span>

                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={isSubmitting || !inputText.trim()}
                  aria-label="Send message"
                  className="w-8 h-8 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                  <span className="material-symbols-outlined text-[17px]">arrow_upward</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quiet disclaimer */}
          <div className="text-center mt-2 text-[10px] text-[#64748B]">
            Grounded in SAP HANA in-memory columnar vector store · AI results should be verified with official general ledgers
          </div>
        </div>
      </div>
    </div>
  );
};
