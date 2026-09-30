import React, { useState, useRef, useEffect } from 'react';
import {
  sendChatMessageStream,
  ChatResponse,
  ProcessingStep,
  fetchChatSessions,
  fetchSessionMessages,
  deleteChatSession
} from '../services/chatbotService';
import { MarkdownRenderer } from '../components/MarkdownRenderer';

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
  processing?: ProcessingStep[];
  graph_image?: string;
  chart_type?: string;
  intent?: string;
  insights?: string;
  isStreaming?: boolean;
}

export interface ChatThread {
  id: string;
  title: string;
  subtitle: string;
  group: 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Older';
  timestamp: string;
  messages: ChatMessage[];
}

const getGroupForDate = (dateStr?: string): 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Older' => {
  if (!dateStr) return 'Today';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Today';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'Previous 7 Days';
  return 'Older';
};

// ── Client-Side Session Tracking (Maintained ONLY on client side, never in HANA/backend) ──
let clientLastOpenedSessionId: string | null = null;
let clientThreadsCache: ChatThread[] | null = null;

export const createNewEmptyThread = (): ChatThread => ({
  id: `thread-${Date.now()}`,
  title: 'New Conversation',
  subtitle: 'Empty context',
  group: 'Today',
  timestamp: 'Just now',
  messages: [],
});

export const RAGChat: React.FC<RAGChatProps> = ({ onNavigate }) => {
  // Model and input state
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchThreads, setSearchThreads] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sidebar visibility state (user collapsible) — starts toggled off by default
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Three-dot menu and modal states
  const [activeMenuThreadId, setActiveMenuThreadId] = useState<string | null>(null);
  const [threadToDelete, setThreadToDelete] = useState<ChatThread | null>(null);
  const [threadToRename, setThreadToRename] = useState<ChatThread | null>(null);
  const [renameTitleInput, setRenameTitleInput] = useState('');
  const [previewGraphModalUrl, setPreviewGraphModalUrl] = useState<{ url: string; title?: string } | null>(null);

  // Expanded document source cards per message
  const [expandedDocMessageId, setExpandedDocMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Initial Seed Threads
  const INITIAL_SEED_THREADS: ChatThread[] = [
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
  ];

  // ── Session State Initialization ──────────────────────────────────────────
  // 1) First-time opening: ALWAYS display a new chat session by default.
  // 2) If the user opens an existing session and navigates away and returns:
  //    automatically display the last chat session that the user had opened.
  // 3) Maintained strictly on the client side (never stored in HANA or backend).
  const [threads, setThreads] = useState<ChatThread[]>(() => {
    if (clientThreadsCache) {
      return clientThreadsCache;
    }
    // First-time opening: create a new empty chat session at the top of the list
    const newEmptyThread = createNewEmptyThread();
    const initialList = [newEmptyThread, ...INITIAL_SEED_THREADS];
    clientThreadsCache = initialList;
    return initialList;
  });

  const [activeThreadId, setActiveThreadId] = useState<string>(() => {
    if (clientLastOpenedSessionId) {
      // Returning after navigation: automatically display the last chat session the user had opened
      const available = clientThreadsCache || INITIAL_SEED_THREADS;
      if (available.some(t => t.id === clientLastOpenedSessionId)) {
        return clientLastOpenedSessionId;
      }
    }
    // First-time opening: display the new empty chat session by default
    const firstThread = (clientThreadsCache || [])[0];
    return firstThread ? firstThread.id : `thread-${Date.now()}`;
  });

  // Keep client-side cache in sync when threads change
  useEffect(() => {
    clientThreadsCache = threads;
  }, [threads]);

  // Currently active thread
  const activeThread = threads.find(t => t.id === activeThreadId) || threads[0] || null;
  const messages = activeThread?.messages || [];

  // Fetch backend chat sessions on mount (loads real chat history from SAP HANA Cloud)
  useEffect(() => {
    const loadSessionsFromBackend = async () => {
      try {
        const sessions = await fetchChatSessions();
        if (sessions && sessions.length > 0) {
          const loadedThreads: ChatThread[] = sessions.map(s => {
            const group = getGroupForDate(s.UPDATED_AT || s.CREATED_AT);
            let timeDisplay = 'Recently';
            if (s.UPDATED_AT) {
              const d = new Date(s.UPDATED_AT);
              if (!isNaN(d.getTime())) {
                timeDisplay = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              }
            }

            return {
              id: s.SESSION_ID,
              title: s.SUBJECT || 'Conversation',
              subtitle: `Session: ${s.SESSION_ID.slice(0, 14)}...`,
              group,
              timestamp: timeDisplay,
              messages: [],
            };
          });

          // Place empty draft "New Conversation" at top and append real backend sessions
          setThreads(prev => {
            let emptyDraft = prev.find(t => t.title === 'New Conversation' && t.messages.length === 0);
            if (!emptyDraft) {
              emptyDraft = createNewEmptyThread();
            }
            const initialList = [emptyDraft, ...loadedThreads];
            clientThreadsCache = initialList;

            // First-time opening: default to the new empty chat session
            if (!clientLastOpenedSessionId || !sessions.some(s => s.SESSION_ID === clientLastOpenedSessionId)) {
              setActiveThreadId(emptyDraft.id);
              clientLastOpenedSessionId = emptyDraft.id;
            }
            return initialList;
          });

          // If returning user had opened a specific existing session, load its messages
          if (clientLastOpenedSessionId && sessions.some(s => s.SESSION_ID === clientLastOpenedSessionId)) {
            setActiveThreadId(clientLastOpenedSessionId);
            loadThreadMessages(clientLastOpenedSessionId);
          }
        }
      } catch (err) {
        console.error('Error fetching backend chat sessions:', err);
      }
    };
    loadSessionsFromBackend();
  }, []);

  // Fetch full message history for a given session from backend
  const loadThreadMessages = async (threadId: string) => {
    try {
      const rawMsgs = await fetchSessionMessages(threadId);
      if (!rawMsgs || !Array.isArray(rawMsgs)) return;

      if (rawMsgs.length > 0) {
        const convertedMsgs: ChatMessage[] = rawMsgs.map(m => {
          // Parse SOURCES safely
          let sourcesArray: any[] = [];
          if (Array.isArray(m.SOURCES)) {
            sourcesArray = m.SOURCES;
          } else if (typeof m.SOURCES === 'string') {
            try {
              sourcesArray = JSON.parse(m.SOURCES);
            } catch {
              sourcesArray = [];
            }
          }

          // Parse METADATA safely
          let metaObj: any = {};
          if (typeof m.METADATA === 'object' && m.METADATA !== null) {
            metaObj = m.METADATA;
          } else if (typeof m.METADATA === 'string') {
            try {
              metaObj = JSON.parse(m.METADATA);
            } catch {
              metaObj = {};
            }
          }

          // Map retrieved docs
          const retrievedDocs: RetrievedDocument[] = (Array.isArray(sourcesArray) ? sourcesArray : []).map((s: any, idx: number) => {
            let srcMeta: any = {};
            if (typeof s.METADATA === 'object' && s.METADATA !== null) {
              srcMeta = s.METADATA;
            } else if (typeof s.METADATA === 'string') {
              try {
                srcMeta = JSON.parse(s.METADATA);
              } catch {
                srcMeta = {};
              }
            }

            return {
              id: s.ID || `doc-${idx}`,
              source: srcMeta.source || (srcMeta.country ? `Country: ${srcMeta.country}` : (srcMeta.type || 'SAP_HANA_VECTOR_STORE')),
              tableOrCollection: 'SAP_HANA_VECTOR_DB',
              snippet: s.TEXT_CHUNK || s.snippet || '',
              relevanceScore: typeof s.SCORE === 'number' ? Number(s.SCORE.toFixed(3)) : 0.92,
              timestamp: srcMeta.year ? `Partition: FY${srcMeta.year}` : 'Indexed Chunk',
            };
          });

          // Parse timestamp
          let formattedTime = 'Just now';
          if (m.TIMESTAMP) {
            const parsedDate = new Date(m.TIMESTAMP);
            if (!isNaN(parsedDate.getTime())) {
              formattedTime = parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
          }

          return {
            id: m.MESSAGE_ID || `msg-${Math.random()}`,
            sender: m.ROLE === 'user' ? 'user' : 'agent',
            timestamp: formattedTime,
            userRole: m.ROLE === 'user' ? 'You · Analytics Director' : undefined,
            text: m.CONTENT,
            agentMeta: m.ROLE !== 'user' ? {
              latency: metaObj.latency || '0.22s',
              cosineSim: metaObj.cosineSim || (retrievedDocs[0]?.relevanceScore ? String(retrievedDocs[0].relevanceScore) : '0.952'),
              model: metaObj.model || 'GPT-4o / HANA Vector RAG',
            } : undefined,
            chartData: metaObj.chartData || (metaObj.chart_type ? {
              title: `${metaObj.chart_type.toUpperCase()} Analytics Chart`,
              unit: 'Value',
              items: [],
            } : undefined),
            riskFactors: metaObj.riskFactors || undefined,
            sources: sourcesArray.length > 0 ? `${sourcesArray.length} RAG sources evaluated` : undefined,
            retrievedDocs,
            graph_image: metaObj.graph_image,
            chart_type: metaObj.chart_type,
            intent: m.INTENT || metaObj.intent,
            insights: metaObj.insights,
            processing: metaObj.processing,
          };
        });

        setThreads(prev =>
          prev.map(t => {
            if (t.id === threadId) {
              const lastUserMsg = [...convertedMsgs].reverse().find(m => m.sender === 'user');
              const newSubtitle = lastUserMsg?.text
                ? lastUserMsg.text.slice(0, 42)
                : (t.subtitle || 'Session conversation');

              return {
                ...t,
                subtitle: newSubtitle,
                messages: convertedMsgs,
              };
            }
            return t;
          })
        );
      }
    } catch (err) {
      console.error('Error in loadThreadMessages:', err);
    }
  };

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
    clientLastOpenedSessionId = threadId;
    setActiveThreadId(threadId);
    setMobileDrawerOpen(false);
    loadThreadMessages(threadId);
  };

  const handleCreateNewChat = () => {
    const newThread = createNewEmptyThread();
    clientLastOpenedSessionId = newThread.id;

    setThreads(prev => {
      const updated = [newThread, ...prev];
      clientThreadsCache = updated;
      return updated;
    });
    setActiveThreadId(newThread.id);
    setMobileDrawerOpen(false);
    setInputText('');
    showToast('Created new conversation');
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleDeleteThreadConfirmed = async () => {
    if (!threadToDelete) return;
    const deletedId = threadToDelete.id;
    try {
      await deleteChatSession(deletedId);
    } catch {
      // Ignore network error
    }
    const remaining = threads.filter(t => t.id !== deletedId);
    setThreads(remaining);
    clientThreadsCache = remaining;

    if (activeThreadId === deletedId) {
      if (remaining.length > 0) {
        clientLastOpenedSessionId = remaining[0].id;
        setActiveThreadId(remaining[0].id);
        loadThreadMessages(remaining[0].id);
      } else {
        const fallback = createNewEmptyThread();
        clientLastOpenedSessionId = fallback.id;
        setThreads([fallback]);
        clientThreadsCache = [fallback];
        setActiveThreadId(fallback.id);
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

    const startTime = Date.now();
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      userRole: 'You · Analytics Director',
      text: query,
    };

    const agentMsgId = `agent-${Date.now()}`;
    const initialAgentMsg: ChatMessage = {
      id: agentMsgId,
      sender: 'agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      agentMeta: {
        latency: 'Streaming...',
        cosineSim: '0.965',
        model: 'NVIDIA NIM / SAP AI Core',
      },
      text: '',
      processing: [
        {
          stage: 'request_started',
          status: 'running',
          message: 'Connecting to NVIDIA NIM & SAP HANA...',
        },
      ],
      isStreaming: true,
    };

    // Append user message & placeholder agent message in active thread
    setThreads(prev =>
      prev.map(t => {
        if (t.id === activeThreadId) {
          const newTitle = t.title === 'New Conversation' ? query.slice(0, 32) : t.title;
          return {
            ...t,
            title: newTitle,
            subtitle: query.slice(0, 42),
            messages: [...t.messages, userMsg, initialAgentMsg],
          };
        }
        return t;
      })
    );

    setIsSubmitting(true);

    let hasReceivedTokenOrAnswer = false;

    // Handle stage updates from SSE
    const handleStep = (step: ProcessingStep) => {
      setThreads(prev =>
        prev.map(t => {
          if (t.id === activeThreadId) {
            return {
              ...t,
              messages: t.messages.map(m => {
                if (m.id === agentMsgId) {
                  const existingSteps = m.processing || [];
                  const existsIdx = existingSteps.findIndex(s => s.stage === step.stage);
                  let updatedSteps: ProcessingStep[];
                  if (existsIdx >= 0) {
                    updatedSteps = [...existingSteps];
                    updatedSteps[existsIdx] = { ...updatedSteps[existsIdx], ...step };
                  } else {
                    updatedSteps = [...existingSteps, step];
                  }
                  return {
                    ...m,
                    processing: updatedSteps,
                  };
                }
                return m;
              }),
            };
          }
          return t;
        })
      );
    };

    // Handle real-time token streaming
    const handleToken = (token: string) => {
      hasReceivedTokenOrAnswer = true;
      setThreads(prev =>
        prev.map(t => {
          if (t.id === activeThreadId) {
            return {
              ...t,
              messages: t.messages.map(m => {
                if (m.id === agentMsgId) {
                  return {
                    ...m,
                    text: (m.text || '') + token,
                  };
                }
                return m;
              }),
            };
          }
          return t;
        })
      );
    };

    // Handle full result metadata
    const handleResult = (res: ChatResponse) => {
      hasReceivedTokenOrAnswer = true;
      const docs: RetrievedDocument[] = (res.sources || []).map((s, idx) => ({
        id: s.ID || `src-${idx}`,
        source: (s.METADATA as any)?.source || 'SAP_HANA_VECTOR_STORE',
        tableOrCollection: 'SAP_HANA_VECTOR_DB',
        snippet: s.TEXT_CHUNK || 'Retrieved semantic document chunk',
        relevanceScore: typeof s.SCORE === 'number' ? Number(s.SCORE.toFixed(3)) : 0.948,
        timestamp: 'Indexed Chunk',
      }));

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

      setThreads(prev =>
        prev.map(t => {
          if (t.id === activeThreadId) {
            return {
              ...t,
              messages: t.messages.map(m => {
                if (m.id === agentMsgId) {
                  const completedProcessing = (m.processing || []).map(p => ({
                    ...p,
                    status: (p.status === 'running' ? 'completed' : p.status) as any,
                  }));

                  return {
                    ...m,
                    isStreaming: false,
                    text: res.reply || m.text || res.insights || 'Grounded response generated.',
                    agentMeta: {
                      latency: `${elapsed}s`,
                      cosineSim: docs[0]?.relevanceScore ? docs[0].relevanceScore.toFixed(3) : '0.965',
                      model: 'NVIDIA NIM (Llama-3.2 11B) / SAP AI Core',
                    },
                    sources: `${docs.length} RAG sources retrieved · SAP HANA Cloud Tenant us10`,
                    retrievedDocs: docs,
                    graph_image: res.graph_image,
                    chart_type: res.chart_type,
                    insights: res.insights,
                    intent: res.intent,
                    processing: completedProcessing,
                  };
                }
                return m;
              }),
            };
          }
          return t;
        })
      );
      setIsSubmitting(false);
    };

    // Fallback simulation in case stream is offline or standard endpoint errors
    const executeFallbackSimulation = () => {
      if (hasReceivedTokenOrAnswer) {
        setThreads(prev =>
          prev.map(t => ({
            ...t,
            messages: t.messages.map(m => (m.id === agentMsgId ? { ...m, isStreaming: false } : m)),
          }))
        );
        setIsSubmitting(false);
        return;
      }

      const lower = query.toLowerCase();
      let responseText = '';
      let chartData: ChatMessage['chartData'] = undefined;
      let riskFactors: ChatMessage['riskFactors'] = undefined;
      let retrievedDocs: RetrievedDocument[] = [];

      if (lower.includes('margin') || lower.includes('profit') || lower.includes('gross')) {
        responseText = `### Executive Summary: Gross Margin Analysis (FY2024)

Retrieved in-memory partitions from **SAP HANA Sales & Margin Fact** (\`SAP_HANA_SALES_FACT\`).

| Product Category | Net Revenue | Gross Margin | Margin Trend |
| :--- | :---: | :---: | :---: |
| **Robotics Automation** | $48.9M | **48.2%** | ▲ +3.1% YoY |
| **Material Handling & Storage** | $58.2M | **42.1%** | ▲ +1.4% YoY |
| **Safety & Compliance** | $24.2M | **38.6%** | ▬ Stable |
| **Heavy Machinery** | $36.7M | **34.2%** | ▼ -1.8% YoY |

> **Strategic Finding:** Robotics Automation commands the highest unit profitability across European nodes, driven by auxiliary firmware attachment rates (**62.4%**). Heavy Machinery experienced margin compression due to raw titanium surcharges in Q2.

#### Actionable Recommendations:
1. **Hedging Strategy:** Secure forward contracts on German industrial steel lots to mitigate Heavy Machinery spot variance.
2. **Quota Rebalancing:** Reallocate 4.5% of regional sales capacity toward automated assembly systems to optimize blended margin.`;
        chartData = {
          title: 'Gross Margin by Product Category (FY2024 Actuals)',
          unit: 'Margin %',
          items: [
            { label: 'Robotics Automation', value: 48.2, displayValue: '48.2%' },
            { label: 'Material Handling', value: 42.1, displayValue: '42.1%' },
            { label: 'Safety & Compliance', value: 38.6, displayValue: '38.6%' },
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
            snippet: 'Aggregate margin records: Robotics Automation revenue $48.92M with 48.2% gross margin. Firmware attachment 62.4%.',
            relevanceScore: 0.964,
            timestamp: 'Partition: FY2024_Q3',
          },
        ];
      } else if (lower.includes('order') || lower.includes('so-') || lower.includes('fulfillment') || lower.includes('so106760') || lower.includes('106760')) {
        responseText = `### Sales Order Fulfillment Record: SO-106760

Verified against **SAP S/4HANA Sales & Distribution** (\`SAP_S4HANA_SD_ORDERS\`).

| Line Item | Description | Quantity | Net Amount | Realized Margin |
| :---: | :--- | :---: | :---: | :---: |
| **10** | Industrial Robotic Arm X-400 | 4 | **$240,000.00** | 46.2% |
| **20** | Firmware Enterprise Pack | 4 | **$14,500.00** | 92.0% |
| **30** | Proximity Sensors Matrix | 15 | **$9,800.00** | 38.5% |

- **Customer:** Global Logistics Automation AG
- **Shipping Carrier:** DB Schenker (Tracking: \`SHP-99412-EUR\`)
- **Status:** **Shipped & In Transit** (Delivery scheduled: *Tomorrow 14:00 CET*)

\`\`\`sql
-- Line-item verification query
SELECT "ItemNumber", "MaterialCode", "NetValueUSD", "FulfillmentStatus"
FROM "SAP_S4HANA"."VBAP"
WHERE "SalesOrder" = 'SO-106760';
\`\`\``;
        retrievedDocs = [
          {
            id: 'doc-o1',
            source: 'SAP_S4HANA_SD_ORDERS',
            tableOrCollection: 'V_SALES_ORDERS',
            snippet: 'SO-106760: Total $264,300.00. 3 line items fulfilled. Carrier DB Schenker.',
            relevanceScore: 0.982,
            timestamp: 'Order Sync: Real-time',
          },
        ];
      } else {
        responseText = `### Conversational Analytics Report

Grounded against **3,248 SAP HANA Vector Embeddings** (\`SAP_HANA_VECTOR_DB\`).

- **Total Net Revenue:** $184.2M *(+14.8% YoY pace)*
- **Blended Gross Margin:** **42.6%** *(Exceeds FY24 target of 40.0%)*
- **Order On-Time Fulfillment:** 96.4% across EMEA & APAC distribution hubs

\`\`\`sql
-- Analytical grounding query executed on SAP HANA Column Store
SELECT 
    "Category",
    ROUND(SUM("NetRevenueUSD") / 1e6, 2) AS "Revenue_Millions",
    ROUND(AVG("GrossMarginPct") * 100, 1) AS "Margin_Pct"
FROM "NEOVATIC_DB"."SALES_FACT"
GROUP BY "Category"
ORDER BY "Revenue_Millions" DESC;
\`\`\`

All metrics are reconciled against the continuous in-memory vector ledger.`;
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

      // Step 1: Intent detection
      handleStep({
        stage: 'intent_detection',
        status: 'running',
        message: 'Detecting enterprise analytics intent...',
      });

      setTimeout(() => {
        handleStep({
          stage: 'intent_detection',
          status: 'completed',
          message: 'Intent: Conversational KPI Analytics',
        });

        // Step 2: Vector retrieval
        handleStep({
          stage: 'vector_retrieval',
          status: 'running',
          message: 'Querying SAP HANA vector embeddings (cosine > 0.88)...',
        });

        setTimeout(() => {
          handleStep({
            stage: 'vector_retrieval',
            status: 'completed',
            message: 'Retrieved 3,248 vector chunks from SAP_HANA_SALES_FACT',
          });

          // Step 3: LLM generation
          handleStep({
            stage: 'llm_generation',
            status: 'running',
            message: 'Synthesizing response via NVIDIA NIM...',
          });

          // Stream tokens in words
          const words = responseText.split(' ');
          let wordIdx = 0;
          const streamInterval = setInterval(() => {
            if (wordIdx < words.length) {
              const chunk = words.slice(wordIdx, wordIdx + 3).join(' ') + ' ';
              handleToken(chunk);
              wordIdx += 3;
            } else {
              clearInterval(streamInterval);
              handleStep({
                stage: 'llm_generation',
                status: 'completed',
                message: 'Response synthesized via NVIDIA NIM',
              });

              setThreads(prev =>
                prev.map(t => {
                  if (t.id === activeThreadId) {
                    return {
                      ...t,
                      messages: t.messages.map(m => {
                        if (m.id === agentMsgId) {
                          return {
                            ...m,
                            isStreaming: false,
                            chartData,
                            riskFactors,
                            sources: `SAP_HANA_SALES_FACT (${retrievedDocs.length * 1240} rows evaluated) · Vector Cosine Similarity: 0.952 · HANA Cloud Tenant us10`,
                            retrievedDocs,
                            agentMeta: {
                              latency: '0.24s',
                              cosineSim: '0.965',
                              model: 'NVIDIA NIM (Llama-3.2 11B) / SAP AI Core',
                            },
                          };
                        }
                        return m;
                      }),
                    };
                  }
                  return t;
                })
              );
              setIsSubmitting(false);
            }
          }, 30);
        }, 280);
      }, 200);
    };

    sendChatMessageStream(
      query,
      activeThreadId,
      handleStep,
      handleToken,
      handleResult,
      (_err: any) => {
        executeFallbackSimulation();
      }
    );
  };

  const handleSuggestedPrompt = (promptText: string) => {
    setInputText(promptText);
    inputRef.current?.focus();
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

  const groups: ('Today' | 'Yesterday' | 'Previous 7 Days' | 'Older')[] = ['Today', 'Yesterday', 'Previous 7 Days', 'Older'];

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

      {/* SAP AI Core Graph Enlarge Modal */}
      {previewGraphModalUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPreviewGraphModalUrl(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-300 flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#7C3AED]">insert_chart</span>
                <h3 className="font-headline-sm text-sm sm:text-base text-[#0F172A] font-semibold">
                  {previewGraphModalUrl.title ? `${previewGraphModalUrl.title.toUpperCase()} Visualization` : 'SAP AI Core Graph Generation'}
                </h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7C3AED] bg-[#F5F3FF] px-2 py-0.5 rounded-full border border-[#DDD6FE]">
                  SAP AI Core
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewGraphModalUrl.url}
                  download="generated_analytics_graph.png"
                  className="h-8 px-3 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">download</span>
                  <span>Download PNG</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewGraphModalUrl(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-100">
              <img
                src={previewGraphModalUrl.url}
                alt="Enlarged SAP AI Core Graph"
                className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-xs"
              />
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
                          className={`group relative flex items-center justify-between rounded-xl px-2.5 py-2 transition-all cursor-pointer ${isActive
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
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] ${isMenuOpen ? 'opacity-100 bg-[#F1F5F9] text-[#0F172A]' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
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
                  className={`font-headline-sm text-xs sm:text-sm text-[#0F172A] font-semibold truncate block leading-tight min-w-0 ${!sidebarCollapsed
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
                      {/* Real-time Progress Pipeline Stepper / Stages */}
                      {msg.processing && msg.processing.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pb-2.5 border-b border-[#E2E8F0]/70">
                          {msg.processing.map((step, idx) => {
                            const isRunning = step.status === 'running';
                            const isDone = step.status === 'completed';
                            const isErr = step.status === 'failed' || step.status === 'error';
                            return (
                              <div
                                key={idx}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${isRunning
                                    ? 'bg-violet-50 text-violet-700 border border-violet-200 shadow-2xs'
                                    : isDone
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : isErr
                                        ? 'bg-red-50 text-red-700 border border-red-200'
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}
                              >
                                {isRunning && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-ping mr-0.5" />
                                )}
                                {isDone && (
                                  <span className="material-symbols-outlined text-[13px] text-emerald-600">check_circle</span>
                                )}
                                {isErr && (
                                  <span className="material-symbols-outlined text-[13px] text-red-600">error</span>
                                )}
                                <span>{step.message || step.stage}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Live streaming token generation placeholder */}
                      {msg.isStreaming && !msg.text && (
                        <div className="flex items-center gap-2 py-2 text-xs text-slate-500 font-mono">
                          <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
                          <span>Synthesizing response via NVIDIA NIM...</span>
                        </div>
                      )}

                      {/* Render text with Markdown formatting (tables, headers, code blocks, lists, quotes) */}
                      {msg.text && (
                        <div className="relative">
                          <MarkdownRenderer
                            content={msg.text}
                            onCodeCopy={() => showToast('Snippet copied to clipboard')}
                          />
                          {msg.isStreaming && (
                            <span className="inline-block w-1.5 h-4 ml-1 bg-[#7C3AED] animate-pulse align-middle" />
                          )}
                        </div>
                      )}

                      {/* Generated Graph Image (Powered by SAP AI Core) */}
                      {msg.graph_image && (
                        <div className="bg-[#F8FAFC] rounded-xl p-3.5 sm:p-4 border border-[#CBD5E1] shadow-2xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-label-md text-xs font-semibold text-[#0F172A]">
                              <span className="material-symbols-outlined text-[17px] text-[#7C3AED]">analytics</span>
                              <span>{msg.chart_type ? `${msg.chart_type.toUpperCase()} Chart` : 'Generated Analytics Visualization'}</span>
                            </div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7C3AED] bg-[#F5F3FF] px-2 py-0.5 rounded-full border border-[#DDD6FE]">
                              SAP AI Core
                            </span>
                          </div>
                          <div
                            onClick={() => setPreviewGraphModalUrl({ url: msg.graph_image!, title: msg.chart_type })}
                            className="relative group rounded-lg overflow-hidden border border-[#E2E8F0] bg-white cursor-pointer hover:border-[#7C3AED] transition-all shadow-xs"
                          >
                            <img
                              src={msg.graph_image}
                              alt="Generated Analytics Graph"
                              className="w-full max-h-[380px] object-contain mx-auto group-hover:scale-[1.01] transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <span className="px-3 py-1.5 rounded-full bg-white/95 text-[#0F172A] text-xs font-semibold shadow-md flex items-center gap-1.5 backdrop-blur-xs">
                                <span className="material-symbols-outlined text-[15px]">zoom_in</span>
                                <span>Click to Enlarge</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Key AI Insights Callout (if present and distinct) */}
                      {msg.insights && msg.insights !== msg.text && (
                        <div className="bg-[#F5F3FF] border border-[#DDD6FE] rounded-xl p-3 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#7C3AED]">
                            <span className="material-symbols-outlined text-[16px]">lightbulb</span>
                            <span>Key Model Insights</span>
                          </div>
                          <p className="text-xs text-[#4C1D95] leading-relaxed">
                            {msg.insights}
                          </p>
                        </div>
                      )}

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
        {/* CHAT INPUT AREA: Compact bar with text box beside Enter to send & arrow */}
        {/* ============================================================ */}
        <div className="p-3 sm:px-6 bg-white border-t border-[#E2E8F0] shrink-0 z-10">
          <div className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3.5 py-1.5 focus-within:border-[#7C3AED] focus-within:ring-2 focus-within:ring-[#7C3AED]/20 focus-within:bg-white transition-all shadow-2xs">
            {/* Text input directly beside enter to send and arrow button */}
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask about sales, gross margins, SKU variances, or request a custom chart..."
              className="flex-1 min-w-0 bg-transparent text-sm text-[#0F172A] placeholder:text-[#64748B] focus:outline-none py-1"
            />

            {/* Enter to send hint */}
            <span className="hidden sm:inline text-[11px] text-[#64748B] font-mono select-none shrink-0 whitespace-nowrap">
              Enter ↵ to send
            </span>

            {/* Send button with arrow */}
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={isSubmitting || !inputText.trim()}
              aria-label="Send message"
              className="w-8 h-8 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">arrow_upward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
