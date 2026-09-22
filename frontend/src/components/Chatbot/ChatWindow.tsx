import React, { useState, useEffect, useCallback } from 'react';
import './chat.css';
import { ChatHistory, type ChatMessage } from './ChatHistory';
import { ChatInput } from './ChatInput';
import { SuggestedQuestions } from './SuggestedQuestions';
import { ChatSessionSidebar } from './ChatSessionSidebar';
import {
  sendChatMessageStream,
  fetchChatSessions,
  fetchSessionMessages,
  deleteChatSession,
  type ProcessingStep,
  type ChatSession,
  type ChatMessageRecord,
} from '../../services/chatbot';
import {
  Sparkles,
  Trash2,
  BarChart3,
  Download,
} from 'lucide-react';

interface ChatWindowProps {
  onNavigate?: (tab: string) => void;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  sender: 'bot',
  text: `### 👋 Welcome to Analytics & RAG Chat

Ask questions about sales revenue, margins, quarterly performance, or request custom charts on the fly.

**Try asking:**
- *Show monthly revenue trend for 2024 and 2025*
- *Compare gross profit margin across product categories*
- *Lookup order details for SO-106760*`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

export const ChatWindow: React.FC<ChatWindowProps> = ({ onNavigate }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const [activeProcessingSteps, setActiveProcessingSteps] = useState<ProcessingStep[]>([]);

  // Session state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // ── Fetch session list on mount ────────────────────────────────────────────

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await fetchChatSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // ── Select a session and load its messages ─────────────────────────────────

  const handleSelectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setMessages([]); // Clear while loading
    setActiveProcessingSteps([]);

    try {
      const records: ChatMessageRecord[] = await fetchSessionMessages(sessionId);

      if (records.length === 0) {
        setMessages([
          {
            id: 'session-empty',
            sender: 'bot',
            text: '### 📂 Empty Session\n\nThis session has no messages yet. Start typing below!',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        return;
      }

      // Convert HANA records → ChatMessage[]
      const chatMessages: ChatMessage[] = records.map((rec) => ({
        id: rec.MESSAGE_ID,
        sender: rec.ROLE === 'user' ? 'user' : 'bot',
        text: rec.CONTENT,
        sources: rec.SOURCES || undefined,
        graph_image: rec.METADATA?.graph_image || undefined,
        chart_type: rec.METADATA?.chart_type || undefined,
        insights: rec.METADATA?.insights || undefined,
        timestamp: (() => {
          if (!rec.TIMESTAMP) return '';
          let ts = rec.TIMESTAMP.trim();
          if (!ts.endsWith('Z') && !ts.includes('+') && !ts.includes('-', 11)) {
            ts = ts.replace(' ', 'T') + 'Z';
          }
          const d = new Date(ts);
          return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        })(),
      }));

      setMessages(chatMessages);
    } catch (err) {
      console.error('Failed to load session messages:', err);
      setMessages([
        {
          id: 'load-error',
          sender: 'bot',
          text: '### ⚠️ Error\n\nFailed to load conversation history. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  // ── New Chat ───────────────────────────────────────────────────────────────

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([WELCOME_MESSAGE]);
    setActiveProcessingSteps([]);
  };

  // ── Delete Session ─────────────────────────────────────────────────────────

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.SESSION_ID !== sessionId));
      // If the deleted session was active, reset to new chat
      if (sessionId === activeSessionId) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  // ── Send Message ───────────────────────────────────────────────────────────

  const handleSend = async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setActiveProcessingSteps([]);

    // Use active session or let backend create a new one
    const sessionIdToSend = activeSessionId || 'default';

    sendChatMessageStream(
      text,
      sessionIdToSend,
      (step: ProcessingStep) => {
        setActiveProcessingSteps((prev) => {
          const existingIdx = prev.findIndex((s) => s.stage === step.stage);
          if (existingIdx >= 0) {
            const copy = [...prev];
            copy[existingIdx] = step;
            return copy;
          }
          return [...prev, step];
        });
      },
      (res) => {
        const botMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: res.reply,
          sources: res.sources,
          graph_image: res.graph_image,
          chart_type: res.chart_type,
          insights: res.insights,
          processing: res.processing,
          records_matched: res.records_matched,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
        setLoading(false);
        setActiveProcessingSteps([]);

        // If backend returned a new session_id, update state and refresh sessions
        if (res.session_id && res.session_id !== 'default') {
          setActiveSessionId(res.session_id);
          loadSessions(); // Refresh sidebar
        }
      },
      (err) => {
        console.error('Chat error:', err);
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: `### ⚠️ Connection Notice\n\nUnable to retrieve data. Please ensure the backend server is running and try again.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setLoading(false);
        setActiveProcessingSteps([]);
      }
    );
  };

  // ── Clear Chat ─────────────────────────────────────────────────────────────

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'bot',
        text: `### 🔄 Session Cleared\n\nConversation reset. Ready for your next query or visualization prompt.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // ── Export Chat ────────────────────────────────────────────────────────────

  const handleExportChat = () => {
    const transcript = messages
      .map((m) => `[${m.timestamp}] ${m.sender.toUpperCase()}:\n${m.text}\n`)
      .join('\n---\n\n');
    const blob = new Blob([transcript], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Analytics_Chat_Transcript_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full" style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* Session Sidebar */}
      <ChatSessionSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        loading={sessionsLoading}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col max-w-5xl mx-auto space-y-4 p-4 overflow-hidden">
        {/* Streamlined Header Banner */}
        <div className="glass-panel p-4 sm:p-5 bg-gradient-to-r from-white via-indigo-50/30 to-sky-50/30 border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl text-white flex-shrink-0 shadow-sm shadow-indigo-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                    RAG Analytics
                  </span>
                  <span className="text-[11px] text-slate-400">Natural Language & Visuals</span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                  Conversational Analytics & RAG Chat
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Query enterprise data, analyze KPIs, and generate visual charts in real time.
                </p>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                onClick={handleExportChat}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-all"
                title="Export conversation"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
              <button
                onClick={handleClearChat}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-rose-700 bg-white hover:bg-rose-50 hover:border-rose-200 border border-slate-200 rounded-lg shadow-2xs transition-all"
                title="Clear conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('graph')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-all"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Graph Studio</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="glass-panel p-4 sm:p-5 border border-slate-200 bg-white space-y-3.5 flex-1 overflow-hidden flex flex-col">
          <ChatHistory
            messages={messages}
            loading={loading}
            activeProcessingSteps={activeProcessingSteps}
          />
          <SuggestedQuestions onSelect={handleSend} />
          <ChatInput onSend={handleSend} disabled={loading} />
        </div>
      </div>
    </div>
  );
};
