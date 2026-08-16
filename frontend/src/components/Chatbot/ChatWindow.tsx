import React, { useState } from 'react';
import './chat.css';
import { ChatHistory, type ChatMessage } from './ChatHistory';
import { ChatInput } from './ChatInput';
import { SuggestedQuestions } from './SuggestedQuestions';
import { sendChatMessage } from '../../services/chatbot';
import {
  Sparkles,
  Trash2,
  BarChart3,
  Download,
  Layers,
  Database,
} from 'lucide-react';

interface ChatWindowProps {
  onNavigate?: (tab: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ onNavigate }) => {
  const initialWelcomeMessage: ChatMessage = {
    id: 'welcome',
    sender: 'bot',
    text: `### 👋 Welcome to the Enterprise Conversational Analytics & Production RAG Assistant!

I am grounded in your **39-column preprocessed enterprise dataset** with **SAP HANA Cloud Vector Engine** embeddings and high-performance **Llama-3.3-70B** reasoning.

#### 💡 What I can do for you:
- **Executive KPI & Trend Inquiries:** Ask strategic questions regarding revenue drivers, regional growth, discount impacts, and gross margin health.
- **Dynamic Python Visualizations:** Request custom bar charts, trend lines, scatter plots, or pie charts on the fly.
- **Deep-Dive Transaction Lookup:** Retrieve complete structured order data (e.g. \`SO-106760\`) with full financial and product breakdowns.

*Feel free to select a prompt below or type your inquiry to get started.*`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialWelcomeMessage]);
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `rag-sess-${Math.random().toString(36).substring(2, 8)}`);

  const handleSend = async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await sendChatMessage(text, sessionId);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: res.reply,
        sources: res.sources,
        graph_image: res.graph_image,
        chart_type: res.chart_type,
        insights: res.insights,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: `### ⚠️ Context Retrieval Notice\n\nI was unable to complete the RAG synthesis. Please verify that the backend API server is active at \`http://127.0.0.1:8000\` and try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'bot',
        text: `### 🔄 Session Cleared\n\nConversation memory has been reset. Ready for your next enterprise query or visualization prompt.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleExportChat = () => {
    const transcript = messages
      .map((m) => `[${m.timestamp}] ${m.sender.toUpperCase()}:\n${m.text}\n`)
      .join('\n---\n\n');
    const blob = new Blob([transcript], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RAG_Analytics_Chat_Transcript_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Enterprise Header Banner */}
      <div className="glass-panel p-6 bg-gradient-to-r from-white via-indigo-50/40 to-sky-50/40 border border-slate-200/90 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3.5 bg-gradient-to-tr from-indigo-600 via-violet-600 to-purple-600 rounded-2xl shadow-lg shadow-indigo-600/25 text-white flex-shrink-0 ring-4 ring-indigo-50">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wider border border-indigo-200/60">
                  Production RAG
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  HANA Vector Engine Online
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  NVIDIA Llama-3.3-70B
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                Conversational Analytics & RAG Chat
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                Perform natural language queries against vector document embeddings, analyze financial KPIs, or request on-the-fly chart generation.
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportChat}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-all"
              title="Export conversation as Markdown"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-rose-700 bg-white hover:bg-rose-50 hover:border-rose-200 border border-slate-200 rounded-xl shadow-2xs transition-all"
              title="Clear conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
            {onNavigate && (
              <button
                onClick={() => onNavigate('graph')}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100/80 border border-sky-200 rounded-xl shadow-2xs transition-all"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Full Graph Studio</span>
              </button>
            )}
          </div>
        </div>

        {/* Live System Status Strip */}
        <div className="mt-4 pt-3.5 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              <span className="font-semibold text-slate-700">Vector Store:</span>
              <span className="font-mono text-slate-600">REAL_VECTOR(1536)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              <span className="font-semibold text-slate-700">Dataset:</span>
              <span>SAC_Sales_Preprocessed (39 cols)</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Messages:</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-200/80 font-mono text-[10px] font-bold text-slate-800">
              {messages.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="glass-panel p-5 sm:p-6 border border-slate-200/90 bg-white shadow-sm space-y-4">
        <ChatHistory
          messages={messages}
          loading={loading}
        />
        <SuggestedQuestions onSelect={handleSend} />
        <ChatInput onSend={handleSend} disabled={loading} />
      </div>
    </div>
  );
};
