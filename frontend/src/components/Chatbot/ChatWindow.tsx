import React, { useState } from 'react';
import { Card } from '../Common/Card';
import { ChatHistory, type ChatMessage } from './ChatHistory';
import { ChatInput } from './ChatInput';
import { SuggestedQuestions } from './SuggestedQuestions';
import { sendChatMessage } from '../../services/chatbot';
import { Sparkles } from 'lucide-react';

export const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Welcome to Unified Conversational RAG & Graph Analytics! Ask me textual questions to retrieve SAP HANA Vector context, or request custom graphs (e.g., 'Bar chart of sales by region', 'Scatter plot of discount vs margin') generated dynamically from our preprocessed Excel sales dataset.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
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
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: "Apologies, I encountered an issue retrieving vector context from SAP HANA Cloud. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Production RAG Chat</h2>
          <p className="text-sm text-slate-500 mt-1">Unified Conversational Analytics powered by SAP HANA Cloud Vector Engine & SAP AI Core LLM.</p>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-700 font-semibold">
          <Sparkles className="w-4 h-4 text-sky-600" />
          <span>Unified Chat & Analytics</span>
        </div>
      </div>

      <Card>
        <div className="space-y-4">
          <ChatHistory messages={messages} loading={loading} />
          <SuggestedQuestions onSelect={handleSend} />
          <ChatInput onSend={handleSend} disabled={loading} />
        </div>
      </Card>
    </div>
  );
};
