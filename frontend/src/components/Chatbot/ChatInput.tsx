import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input);
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <div className="relative flex-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask GenAI assistant about sales figures, forecasts, vector context..."
          disabled={disabled}
          className="w-full glass-input pr-10 text-sm py-3"
        />
        <Sparkles className="w-4 h-4 text-cyan-400 absolute right-3 top-1/2 -translate-y-1/2 opacity-70" />
      </div>
      <button
        type="submit"
        disabled={!input.trim() || disabled}
        className={`btn-primary p-3 flex items-center justify-center rounded-xl ${!input.trim() || disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Send className="w-5 h-5" />
      </button>
    </form>
  );
};
