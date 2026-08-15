import React, { useState } from 'react';
import { Send, X } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <div className="relative flex-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a sales question, query HANA Vector context, or request a custom chart…"
          disabled={disabled}
          className="w-full pl-4 pr-10 py-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white disabled:opacity-60 transition-all shadow-2xs"
        />
        {input && !disabled && (
          <button
            type="button"
            onClick={() => setInput('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <button
        type="submit"
        disabled={!input.trim() || disabled}
        className="px-5 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
      >
        <Send className="w-4 h-4" />
        <span className="hidden sm:inline">Send</span>
      </button>
    </form>
  );
};
