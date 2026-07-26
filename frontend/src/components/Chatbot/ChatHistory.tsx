import React, { useState } from 'react';
import { Bot, User, Database, BarChart2, Maximize2, X } from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  sources?: Array<{ ID?: string; TEXT_CHUNK?: string; SCORE?: number }>;
  graph_image?: string;
  chart_type?: string;
  insights?: string;
  timestamp: string;
}

interface ChatHistoryProps {
  messages: ChatMessage[];
  loading?: boolean;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, loading }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
      {messages.map((msg) => {
        const isUser = msg.sender === 'user';
        return (
          <div
            key={msg.id}
            className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            <div className={`p-2.5 rounded-xl text-white shadow-sm flex-shrink-0 ${
              isUser ? 'bg-gradient-to-tr from-sky-600 to-blue-600' : 'bg-gradient-to-tr from-indigo-600 to-violet-600'
            }`}>
              {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={`max-w-2xl rounded-2xl p-4 text-sm space-y-3 ${
              isUser
                ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-tr-none shadow-sm'
                : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-none shadow-xs'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

              {msg.graph_image && (
                <div className="mt-3 space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between text-xs font-semibold text-sky-800 pb-1 border-b border-slate-200">
                    <div className="flex items-center space-x-1.5">
                      <BarChart2 className="w-4 h-4 text-sky-600" />
                      <span className="capitalize">{msg.chart_type || 'Analytics'} Custom Graph Analytics</span>
                    </div>
                    <button
                      onClick={() => setSelectedImage(msg.graph_image!)}
                      className="flex items-center space-x-1 text-[11px] text-sky-600 hover:text-sky-800 transition-colors"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Expand</span>
                    </button>
                  </div>
                  <div 
                    className="relative group cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white"
                    onClick={() => setSelectedImage(msg.graph_image!)}
                  >
                    <img 
                      src={msg.graph_image.startsWith('data:') ? msg.graph_image : `data:image/png;base64,${msg.graph_image}`} 
                      alt="Generated Custom Graph Analytics" 
                      className="w-full h-auto object-contain max-h-72 transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-slate-900/80 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-md">Click to Zoom</span>
                    </div>
                  </div>
                </div>
              )}

              {msg.sources && msg.sources.length > 0 && (
                <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                  <div className="flex items-center space-x-1 text-[11px] font-semibold text-sky-700">
                    <Database className="w-3.5 h-3.5" />
                    <span>HANA Vector Sources ({msg.sources.length})</span>
                  </div>
                  {msg.sources.map((src, i) => (
                    <div key={i} className="bg-slate-50 p-2 rounded border border-slate-200/70 text-[11px]">
                      <p className="text-slate-700">{src.TEXT_CHUNK}</p>
                      {src.SCORE && <span className="text-[10px] text-sky-600 font-semibold">Cosine Similarity: {(src.SCORE * 100).toFixed(1)}%</span>}
                    </div>
                  ))}
                </div>
              )}

              <span className={`block text-[10px] text-right ${isUser ? 'text-sky-100' : 'text-slate-400'}`}>{msg.timestamp}</span>
            </div>
          </div>
        );
      })}

      {loading && (
        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white animate-pulse">
            <Bot className="w-4 h-4" />
          </div>
          <div className="bg-white border border-slate-200/90 p-4 rounded-2xl rounded-tl-none flex items-center space-x-2 text-xs text-slate-600 shadow-xs">
            <div className="w-2 h-2 rounded-full bg-sky-500 animate-ping"></div>
            <span>Analyzing dataset & processing query (RAG / Graph Analytics)...</span>
          </div>
        </div>
      )}

      {/* Modal image preview */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative bg-white rounded-2xl p-4 max-w-4xl max-h-[90vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={selectedImage.startsWith('data:') ? selectedImage : `data:image/png;base64,${selectedImage}`} alt="Custom Graph Preview" className="w-full h-auto rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
};
