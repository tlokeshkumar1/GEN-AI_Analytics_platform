import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  User,
  Database,
  BarChart2,
  Maximize2,
  X,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from 'lucide-react';

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
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const copyText = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadImage = (imgSrc: string) => {
    const a = document.createElement('a');
    a.href = imgSrc.startsWith('data:') ? imgSrc : `data:image/png;base64,${imgSrc}`;
    a.download = `chat_graph_${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="space-y-4 max-h-[580px] overflow-y-auto pr-2">
      {messages.map((msg) => {
        const isUser = msg.sender === 'user';
        const isSourcesExpanded = !!expandedSources[msg.id];

        return (
          <div
            key={msg.id}
            className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            {/* Avatar */}
            <div
              className={`p-2.5 rounded-2xl text-white shadow-sm flex-shrink-0 ${
                isUser
                  ? 'bg-gradient-to-tr from-sky-600 to-blue-600'
                  : 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-violet-600'
              }`}
            >
              {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-2xl rounded-2xl p-4 text-xs sm:text-sm space-y-3 relative group ${
                isUser
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-tr-none shadow-sm'
                  : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-none shadow-2xs'
              }`}
            >
              {/* Message text */}
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

              {/* Generated graph image attachment */}
              {msg.graph_image && (
                <div className="mt-3 space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 pb-1.5 border-b border-slate-200/80">
                    <div className="flex items-center space-x-1.5">
                      <BarChart2 className="w-4 h-4 text-sky-600" />
                      <span className="capitalize text-slate-800 font-bold">
                        {msg.chart_type || 'Custom'} Visualization
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => downloadImage(msg.graph_image!)}
                        className="flex items-center space-x-1 text-[11px] text-slate-600 hover:text-sky-700 transition-colors"
                        title="Download PNG"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                      <button
                        onClick={() => setSelectedImage(msg.graph_image!)}
                        className="flex items-center space-x-1 text-[11px] text-sky-600 hover:text-sky-800 font-medium transition-colors"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Expand</span>
                      </button>
                    </div>
                  </div>

                  <div
                    className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white"
                    onClick={() => setSelectedImage(msg.graph_image!)}
                  >
                    <img
                      src={
                        msg.graph_image.startsWith('data:')
                          ? msg.graph_image
                          : `data:image/png;base64,${msg.graph_image}`
                      }
                      alt="Generated Graph"
                      className="w-full h-auto object-contain max-h-72 transition-transform duration-200 group-hover:scale-[1.01]"
                    />
                    <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-slate-900/80 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-md">
                        Click to Zoom
                      </span>
                    </div>
                  </div>

                  {msg.insights && (
                    <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-lg text-[11px] text-indigo-900 leading-relaxed">
                      <div className="flex items-center gap-1 font-bold text-indigo-800 mb-1">
                        <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Visual Analysis</span>
                      </div>
                      <p>{msg.insights}</p>
                    </div>
                  )}
                </div>
              )}

              {/* HANA Vector Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="pt-2 border-t border-slate-100 text-xs space-y-1.5">
                  <button
                    onClick={() => toggleSources(msg.id)}
                    className="flex items-center justify-between w-full text-[11px] font-bold text-sky-700 hover:text-sky-900 transition-colors"
                  >
                    <div className="flex items-center space-x-1.5">
                      <Database className="w-3.5 h-3.5 text-sky-600" />
                      <span>SAP HANA Vector Sources ({msg.sources.length})</span>
                    </div>
                    {isSourcesExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {isSourcesExpanded && (
                    <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                      {msg.sources.map((src, i) => (
                        <div
                          key={i}
                          className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-[11px] text-slate-700 space-y-1"
                        >
                          <p className="leading-relaxed">{src.TEXT_CHUNK}</p>
                          {src.SCORE !== undefined && (
                            <span className="inline-block px-1.5 py-0.2 rounded bg-sky-100 text-sky-700 font-mono text-[9px] font-bold">
                              Similarity: {(src.SCORE * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Footer row: Timestamp & Copy */}
              <div className="flex items-center justify-between text-[10px] pt-1">
                <button
                  onClick={() => copyText(msg.id, msg.text)}
                  className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isUser ? 'text-sky-200 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Copy message"
                >
                  {copiedId === msg.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <span className={isUser ? 'text-sky-200' : 'text-slate-400'}>{msg.timestamp}</span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Loading state */}
      {loading && (
        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white animate-pulse">
            <Bot className="w-4 h-4" />
          </div>
          <div className="bg-white border border-slate-200/90 p-4 rounded-2xl rounded-tl-none flex items-center space-x-3 text-xs text-slate-600 shadow-2xs">
            <div className="w-2 h-2 rounded-full bg-sky-500 animate-ping"></div>
            <span>Retrieving HANA Vector embeddings & synthesizing response…</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />

      {/* Zoom Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative bg-white rounded-2xl p-4 max-w-4xl max-h-[90vh] overflow-auto shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700">Zoomed Visual Preview</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadImage(selectedImage)}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <img
              src={
                selectedImage.startsWith('data:')
                  ? selectedImage
                  : `data:image/png;base64,${selectedImage}`
              }
              alt="Custom Graph Preview"
              className="w-full h-auto rounded-xl max-h-[75vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
