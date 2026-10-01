import React, { useState } from 'react';

interface SystemSettingsProps {
  onNavigate: (path: string) => void;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({ onNavigate }) => {
  const [vectorThreshold, setVectorThreshold] = useState('0.88');
  const [embeddingModel, setEmbeddingModel] = useState('text-embedding-3-large (1536d)');
  const [maxTokens, setMaxTokens] = useState('128,000');
  const [autoCompaction, setAutoCompaction] = useState(true);
  const [maskCustomerData, setMaskCustomerData] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleSave = () => {
    showToast('System configuration saved to SAP BTP MTA parameters');
  };

  return (
    <div className="flex flex-col w-full gap-space-xl">
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#111111] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 font-label-md text-label-md animate-in fade-in">
          <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"></span>
            <span className="font-label-sm uppercase tracking-widest text-[#64748B] font-semibold">
              PLATFORM CONFIGURATION · SAP BTP RUNTIME
            </span>
          </div>
          <h1 className="font-headline-xl text-[#0F172A] font-semibold tracking-tight">
            System & Engine Settings
          </h1>
          <p className="font-body-md text-[#475569] mt-1">
            Configure HANA In-Memory Column store thresholds, AI Core vector models, and data masking rules.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start md:self-end mt-2 md:mt-0">
          <button 
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-label-md text-label-md transition-colors shadow-xs whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[16px] text-white">save</span>
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
        {/* HANA Vector Store Settings */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#E2E8F0] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0]">
            <span className="material-symbols-outlined text-[20px] text-[#0F766E]">database</span>
            <h3 className="font-headline-sm font-semibold text-[#0F172A]">SAP HANA Vector Engine</h3>
          </div>

          <div className="space-y-3 font-body-sm">
            <div>
              <label className="font-label-sm uppercase text-[#64748B] block mb-1 font-semibold">
                Vector Cosine Similarity Threshold
              </label>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min="0.70" 
                  max="0.99" 
                  step="0.01" 
                  value={vectorThreshold} 
                  onChange={(e) => setVectorThreshold(e.target.value)}
                  className="flex-1 accent-[#2563EB]"
                />
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">{vectorThreshold}</span>
              </div>
              <p className="text-[11px] text-[#64748B] mt-1">
                Vectors below this cosine threshold are excluded from RAG inference prompt injection.
              </p>
            </div>

            <div>
              <label className="font-label-sm uppercase text-[#64748B] block mb-1 font-semibold">
                Embedding Model Architecture
              </label>
              <select 
                value={embeddingModel}
                onChange={(e) => setEmbeddingModel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] font-body-sm focus:border-[#2563EB] focus:outline-none"
              >
                <option>text-embedding-3-large (1536d)</option>
                <option>SAP-AI-Core-Embed-v2 (1024d)</option>
                <option>Llama-3.2-Vector-90B (2048d)</option>
              </select>
            </div>

            <div className="pt-2">
              <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] transition-colors">
                <div>
                  <div className="font-medium text-[#0F172A]">Auto-Compaction on Buffer Breach</div>
                  <div className="text-xs text-[#64748B]">Trigger garbage collection when memory exceeds 95%</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={autoCompaction} 
                  onChange={(e) => setAutoCompaction(e.target.checked)}
                  className="w-4 h-4 rounded text-[#2563EB] accent-[#2563EB]"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Security & Token Governance */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#E2E8F0] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0]">
            <span className="material-symbols-outlined text-[20px] text-[#2563EB]">security</span>
            <h3 className="font-headline-sm font-semibold text-[#0F172A]">Governance & Privacy</h3>
          </div>

          <div className="space-y-3 font-body-sm">
            <div>
              <label className="font-label-sm uppercase text-[#64748B] block mb-1 font-semibold">
                Context Window Token Budget
              </label>
              <input 
                type="text" 
                value={maxTokens} 
                onChange={(e) => setMaxTokens(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] font-mono text-xs focus:border-[#2563EB] focus:outline-none"
              />
              <p className="text-[11px] text-[#64748B] mt-1">
                Reserved memory buffer for multi-agent reasoning graphs and columnar summaries.
              </p>
            </div>

            <div className="pt-2">
              <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] transition-colors">
                <div>
                  <div className="font-medium text-[#0F172A]">Deterministic Masking on Customer ID</div>
                  <div className="text-xs text-[#64748B]">Comply with GDPR and SOC-2 Type II enterprise audits</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={maskCustomerData} 
                  onChange={(e) => setMaskCustomerData(e.target.checked)}
                  className="w-4 h-4 rounded text-[#2563EB] accent-[#2563EB]"
                />
              </label>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs text-[#475569]">
              Tenant ID: <code className="text-[#2563EB] bg-[#EFF6FF] px-1 py-0.5 rounded font-mono">sap-btp-us10-741e</code> · Status: <strong className="text-[#16A34A]">Encrypted at rest (AES-256)</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
