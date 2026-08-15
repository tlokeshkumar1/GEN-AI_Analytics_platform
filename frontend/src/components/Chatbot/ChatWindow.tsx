import React, { useState } from 'react';
import { ChatHistory, type ChatMessage } from './ChatHistory';
import { ChatInput } from './ChatInput';
import { SuggestedQuestions } from './SuggestedQuestions';
import { sendChatMessage } from '../../services/chatbot';
import {
  Sparkles,
  Trash2,
  BarChart3,
} from 'lucide-react';

interface ChatWindowProps {
  onNavigate?: (tab: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ onNavigate }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "👋 Welcome to the Unified Conversational Analytics & Production RAG Assistant!\n\nI can retrieve vector document embeddings from SAP HANA Cloud Vector Engine and dynamically generate custom Python visualizations from the preprocessed 39-column sales dataset. Try asking a question or requesting a chart below!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [loading, setLoading] = useState(false);

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
      const res = await sendChatMessage(text);
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
        text: "Apologies, I encountered an issue retrieving context or synthesizing the response. Please check that the backend server is running and try again.",
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
        text: "Chat cleared. Ready for your next analytics inquiry or visualization prompt.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 bg-gradient-to-r from-white via-indigo-50/40 to-sky-50/40 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl shadow-md shadow-indigo-600/20 text-white flex-shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                  Production RAG
                </span>
                <span className="text-[11px] text-slate-400">SAP HANA Vector + GPT-4o</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
                Conversational Analytics & RAG Chat
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Ask questions over enterprise vector embeddings or request natural language charts on the fly.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-all"
              title="Clear conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
            {onNavigate && (
              <button
                onClick={() => onNavigate('graph')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-all"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Full Graph Studio</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="glass-panel p-6 border border-slate-200 bg-white space-y-4">
        <ChatHistory messages={messages} loading={loading} />
        <SuggestedQuestions onSelect={handleSend} />
        <ChatInput onSend={handleSend} disabled={loading} />
      </div>
    </div>
  );
};
