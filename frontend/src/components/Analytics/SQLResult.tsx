import React, { useState } from 'react';
import { Code2, Copy, Check } from 'lucide-react';

interface SQLResultProps {
  sql: string;
}

export const SQLResult: React.FC<SQLResultProps> = ({ sql }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-xl p-4 border border-slate-800 space-y-2 shadow-md">
      <div className="flex items-center justify-between text-xs text-slate-300 border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-2 font-mono text-sky-400 font-semibold">
          <Code2 className="w-4 h-4" />
          <span>Generated SAP HANA SQL Query</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-sky-300 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="text-xs font-mono text-sky-300 overflow-x-auto p-2 bg-slate-950 rounded">
        <code>{sql}</code>
      </pre>
    </div>
  );
};
