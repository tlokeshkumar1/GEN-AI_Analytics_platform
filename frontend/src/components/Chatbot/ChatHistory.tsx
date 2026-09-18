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
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { MarkdownMessage } from './MarkdownMessage';
import type { ProcessingStep } from '../../services/chatbot';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  sources?: Array<{ ID?: string; TEXT_CHUNK?: string; SCORE?: number; METADATA?: string }>;
  graph_image?: string;
  chart_type?: string;
  insights?: string;
  processing?: ProcessingStep[];
  records_matched?: number;
  timestamp: string;
}

interface ChatHistoryProps {
  messages: ChatMessage[];
  loading?: boolean;
  activeProcessingSteps?: ProcessingStep[];
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, loading, activeProcessingSteps }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, activeProcessingSteps]);

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const toggleSteps = (msgId: string) => {
    setExpandedSteps((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const copyText = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = (msgId: string, type: 'up' | 'down') => {
    setFeedback((prev) => ({ ...prev, [msgId]: prev[msgId] === type ? undefined! : type }));
  };

  const downloadImage = (imgSrc: string) => {
    const a = document.createElement('a');
    a.href = imgSrc.startsWith('data:') ? imgSrc : `data:image/png;base64,${imgSrc}`;
    a.download = `enterprise_analytics_${Date.now()}.png`;
    a.click();
  };

  const renderStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />;
      case 'running':
        return <Loader2 className="w-3.5 h-3.5 text-sky-600 animate-spin flex-shrink-0" />;
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-slate-300 mx-0.5 flex-shrink-0" />;
    }
  };

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1.5 chat-scroll-container">
      {messages.map((msg) => {
        const isUser = msg.sender === 'user';
        const isSourcesExpanded = !!expandedSources[msg.id];
        const isStepsExpanded = !!expandedSteps[msg.id];
        const userFeedback = feedback[msg.id];

        return (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 transition-all duration-200 ${
              isUser ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs transition-transform ${
                isUser
                  ? 'bg-gradient-to-tr from-sky-600 to-indigo-600 text-white'
                  : 'bg-gradient-to-tr from-indigo-700 to-violet-600 text-white'
              }`}
            >
              {isUser ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            </div>

            {/* Message Bubble Container */}
            <div
              className={`max-w-2xl flex-1 rounded-xl p-3 sm:p-3.5 relative group transition-all duration-150 ${
                isUser
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-tr-none shadow-xs ml-10'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-2xs mr-2'
              }`}
            >
              {/* Bot Header Bar */}
              {!isUser && (
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100 text-[11px]">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <Bot className="w-3 h-3 text-indigo-600" />
                    <span>AI Assistant</span>
                    {msg.records_matched !== undefined && msg.records_matched > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 border border-sky-200 font-mono text-[9.5px]">
                        {msg.records_matched.toLocaleString()} records evaluated
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                </div>
              )}

              {/* Message Content */}
              <div className="chat-message-body text-xs sm:text-[13px]">
                {isUser ? (
                  <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.text}</p>
                ) : (
                  <MarkdownMessage content={msg.text} />
                )}
              </div>

              {/* Real Backend Processing Steps Drawer */}
              {!isUser && msg.processing && msg.processing.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs">
                  <button
                    onClick={() => toggleSteps(msg.id)}
                    className="flex items-center justify-between w-full p-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 text-[10.5px] font-semibold text-slate-700 transition-all"
                  >
                    <div className="flex items-center space-x-1.5">
                      <Layers className="w-3 h-3 text-indigo-600" />
                      <span>Pipeline Stages ({msg.processing.length} executed)</span>
                    </div>
                    {isStepsExpanded ? (
                      <ChevronUp className="w-3 h-3 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    )}
                  </button>

                  {isStepsExpanded && (
                    <div className="mt-1.5 p-2 bg-slate-50/80 rounded-lg border border-slate-200/80 space-y-1 animate-in fade-in duration-150">
                      {msg.processing.map((step, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[10.5px]">
                          <div className="flex items-center space-x-1.5 min-w-0">
                            {renderStepIcon(step.status)}
                            <span className="font-semibold text-slate-700 capitalize">{step.stage}:</span>
                            <span className="text-slate-600 truncate">{step.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Generated Graph Visualizations */}
              {msg.graph_image && (
                <div className="mt-3 space-y-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800">
                  <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-200/80">
                    <div className="flex items-center space-x-1.5">
                      <BarChart2 className="w-3.5 h-3.5 text-sky-600" />
                      <span className="capitalize text-slate-800 font-bold text-xs tracking-tight">
                        {msg.chart_type || 'Custom'} Chart
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => downloadImage(msg.graph_image!)}
                        className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 text-[10px] font-medium transition-all shadow-2xs"
                        title="Download PNG"
                      >
                        <Download className="w-3 h-3" />
                        <span>PNG</span>
                      </button>
                      <button
                        onClick={() => setSelectedImage(msg.graph_image!)}
                        className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-medium transition-all shadow-2xs"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Zoom</span>
                      </button>
                    </div>
                  </div>

                  {/* Chart Preview Image */}
                  <div
                    className="relative group cursor-pointer overflow-hidden rounded-lg border border-slate-200/90 bg-white"
                    onClick={() => setSelectedImage(msg.graph_image!)}
                  >
                    <img
                      src={
                        msg.graph_image.startsWith('data:')
                          ? msg.graph_image
                          : `data:image/png;base64,${msg.graph_image}`
                      }
                      alt="Generated Graph"
                      className="w-full h-auto object-contain max-h-64 transition-transform duration-200 group-hover:scale-[1.01]"
                    />
                  </div>

                  {/* Visual Analysis Key Insight */}
                  {msg.insights && (
                    <div className="p-2 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs text-indigo-950 space-y-0.5">
                      <div className="flex items-center gap-1 font-bold text-indigo-900 text-[11px]">
                        <Lightbulb className="w-3 h-3 text-amber-500" />
                        <span>Summary & Insights</span>
                      </div>
                      <p className="text-indigo-900/90 text-[11px] leading-relaxed">
                        {msg.insights}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* SAP HANA Vector Sources Accordion */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs space-y-1.5">
                  <button
                    onClick={() => toggleSources(msg.id)}
                    className="flex items-center justify-between w-full p-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 text-[11px] font-medium text-slate-700 transition-all"
                  >
                    <div className="flex items-center space-x-1.5">
                      <Database className="w-3 h-3 text-sky-600" />
                      <span>Data Context Sources ({msg.sources.length})</span>
                    </div>
                    {isSourcesExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>

                  {isSourcesExpanded && (
                    <div className="space-y-1.5 pt-0.5 animate-in fade-in duration-150">
                      {msg.sources.map((src, i) => {
                        const scorePercent =
                          src.SCORE !== undefined ? Math.min(100, Math.round(src.SCORE * 100)) : null;

                        return (
                          <div
                            key={i}
                            className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1"
                          >
                            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600">
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3 text-slate-400" />
                                <span>Reference Chunk #{i + 1}</span>
                              </span>
                              {scorePercent !== null && (
                                <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                                  {scorePercent}% Match
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] leading-relaxed text-slate-700 font-mono bg-white p-2 rounded border border-slate-200 whitespace-pre-wrap">
                              {src.TEXT_CHUNK}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Message Action Footer */}
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100 text-xs">
                {isUser ? (
                  <div className="flex items-center justify-between w-full text-[10px]">
                    <button
                      onClick={() => copyText(msg.id, msg.text)}
                      className="flex items-center gap-1 text-sky-200 hover:text-white transition-colors"
                      title="Copy prompt"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-300" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Prompt</span>
                        </>
                      )}
                    </button>
                    <span className="text-sky-200">{msg.timestamp}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => copyText(msg.id, msg.text)}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-[10px] font-medium transition-all"
                        title="Copy response"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <div className="h-2.5 w-px bg-slate-200 mx-0.5"></div>

                      {/* Feedback buttons */}
                      <button
                        onClick={() => handleFeedback(msg.id, 'up')}
                        className={`p-0.5 rounded text-xs transition-colors ${
                          userFeedback === 'up'
                            ? 'text-emerald-600 bg-emerald-50'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                        title="Helpful"
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleFeedback(msg.id, 'down')}
                        className={`p-0.5 rounded text-xs transition-colors ${
                          userFeedback === 'down'
                            ? 'text-rose-600 bg-rose-50'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                        title="Needs improvement"
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Real-time SSE Live Processing State — Progressive Stage Disclosure */}
      {loading && (
        <div className="flex items-start gap-2.5 animate-in fade-in duration-200">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
          </div>

          <div className="max-w-lg flex-1 bg-white border border-indigo-100 rounded-xl rounded-tl-none p-3.5 shadow-xs space-y-2.5">
            {/* Header */}
            <div className="flex items-center space-x-2 pb-1.5 border-b border-indigo-50">
              <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
              <span className="text-xs font-bold text-indigo-900">Processing Request...</span>
            </div>

            {activeProcessingSteps && activeProcessingSteps.length > 0 ? (
              <div className="space-y-0">
                {/* Only render completed and running stages — never pending/future */}
                {activeProcessingSteps
                  .filter((step) => step.status === 'completed' || step.status === 'running' || step.status === 'failed' || step.status === 'error')
                  .map((step, idx, filteredArr) => {
                    const isRunning = step.status === 'running';
                    const isCompleted = step.status === 'completed';
                    const isFailed = step.status === 'failed' || step.status === 'error';
                    const isLast = idx === filteredArr.length - 1;

                    return (
                      <div key={step.stage} className={`relative pipeline-stage-entry ${isRunning ? 'pipeline-stage-running' : ''}`}>
                        {/* Vertical connector line */}
                        {!isLast && (
                          <div className="absolute left-[7px] top-[22px] bottom-0 w-px bg-slate-200" />
                        )}

                        <div className={`flex items-start gap-2.5 py-1.5 transition-all duration-200 ${
                          isRunning ? 'pl-0' : ''
                        }`}>
                          {/* Status icon */}
                          <div className="flex-shrink-0 mt-0.5">
                            {isCompleted && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                            {isRunning && (
                              <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                            )}
                            {isFailed && (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            )}
                          </div>

                          {/* Stage content */}
                          <div className="min-w-0 flex-1">
                            {isCompleted && (
                              <div className="text-[11px]">
                                <span className="font-semibold text-emerald-700 capitalize">{step.stage}</span>
                                <span className="text-slate-500 ml-1.5">{step.message}</span>
                              </div>
                            )}
                            {isRunning && (
                              <div className="text-[11px]">
                                <span className="font-bold text-indigo-700 capitalize">{step.stage}</span>
                                <span className="text-indigo-600 ml-1.5 inline-flex items-center gap-1">
                                  {step.message}
                                  <span className="inline-block w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                                </span>
                              </div>
                            )}
                            {isFailed && (
                              <div className="text-[11px]">
                                <span className="font-semibold text-rose-700 capitalize">{step.stage}</span>
                                <span className="text-rose-600 ml-1.5">{step.message}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-xs text-indigo-800">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></span>
                <span>Connecting to analysis pipeline...</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={bottomRef} />

      {/* Image Preview & Zoom Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative bg-white rounded-3xl p-5 max-w-5xl max-h-[92vh] overflow-auto shadow-2xl flex flex-col border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-800">
                  Interactive Visualization Studio Preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadImage(selectedImage)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-xs transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Image</span>
                </button>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center p-2 bg-slate-50/70 rounded-2xl border border-slate-100">
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
        </div>
      )}
    </div>
  );
};
