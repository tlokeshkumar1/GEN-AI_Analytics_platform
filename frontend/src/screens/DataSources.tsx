import React, { useState } from 'react';
import { fetchHealthStatus } from '../services/healthService';

interface DataSourcesProps {
  onNavigate: (path: string) => void;
}

export const DataSources: React.FC<DataSourcesProps> = ({ onNavigate }) => {
  const [sources, setSources] = useState([
    {
      id: 'src-1',
      name: 'SAP HANA Cloud (In-Memory Column Store)',
      type: 'Primary OLAP / Vector',
      host: 'zeus.hana.prod.eu-central-1.hanacloud.ondemand.com',
      status: 'Connected',
      latency: '12ms',
      lastSync: '2m ago',
      records: '3.4M rows',
      icon: 'database',
    },
    {
      id: 'src-2',
      name: 'SAP S/4HANA Cloud (Sales & Distribution)',
      type: 'Core ERP Source',
      host: 'my300182.s4hana.ondemand.com',
      status: 'Connected',
      latency: '34ms',
      lastSync: '15m ago',
      records: '184 SKUs, 82k Orders',
      icon: 'sync_alt',
    },
    {
      id: 'src-3',
      name: 'SAP AI Core Vector Engine (BTP us10)',
      type: 'Embedding & Inference Cache',
      host: 'api.ai.prod.us-east.aws.ml.hana.ondemand.com',
      status: 'Connected',
      latency: '41ms',
      lastSync: '12m ago',
      records: '3,412 Vector Embeddings',
      icon: 'psychology',
    },
    {
      id: 'src-4',
      name: 'Snowflake Enterprise Data Bridge',
      type: 'Auxiliary Lakehouse Archive',
      host: 'neovatic-eu.snowflakecomputing.com',
      status: 'Standby',
      latency: '82ms',
      lastSync: '1d ago',
      records: 'Historical 2018–2022',
      icon: 'cloud_queue',
    },
  ]);

  const [testingId, setTestingId] = useState<string | null>(null);

  const testConnection = async (id: string) => {
    setTestingId(id);
    const startTime = Date.now();
    try {
      const health = await fetchHealthStatus();
      const elapsed = Date.now() - startTime;
      setSources(prev => prev.map(s => {
        if (s.id === id) {
          const isHana = id === 'src-1' || id === 'src-2';
          const isConnected = isHana ? health.hana_connected : health.ai_core_connected;
          return {
            ...s,
            status: isConnected ? 'Connected' : 'Reconnecting',
            lastSync: 'Just now',
            latency: `${elapsed}ms`
          };
        }
        return s;
      }));
    } catch {
      setSources(prev => prev.map(s => s.id === id ? { ...s, status: 'Reconnecting', lastSync: 'Just now' } : s));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]"></span>
            <span className="font-label-sm uppercase tracking-widest text-[#64748B] font-semibold">
              INFRASTRUCTURE CONNECTORS · BTP INTEGRATION SUITE
            </span>
          </div>
          <h1 className="font-headline-xl text-[#0F172A] font-semibold tracking-tight">
            Data Sources & HDI Containers
          </h1>
          <p className="font-body-md text-[#475569] mt-1">
            Active connections to SAP HANA Cloud, S/4HANA transactional endpoints, and AI Core vector services.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start md:self-end mt-2 md:mt-0">
          <button 
            onClick={() => onNavigate('upload-dataset')}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl bg-white text-[#0F172A] font-label-md text-label-md hover:bg-[#F1F5F9] transition-colors shadow-xs border border-[#CBD5E1] whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[16px] text-[#0F766E]">add_link</span>
            <span>Add Data Connection</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {sources.map(src => {
          const isAiSource = src.id === 'src-3';
          const iconColor = isAiSource ? 'text-[#7C3AED] bg-[#F5F3FF] border-[#DDD6FE]' : 'text-[#0F766E] bg-[#F0FDFA] border-[#CCFBF1]';

          return (
            <div 
              key={src.id}
              className="bg-white p-6 rounded-2xl shadow-xs border border-[#E2E8F0] flex flex-col justify-between hover:border-[#CBD5E1] transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${iconColor}`}>
                      <span className="material-symbols-outlined text-[18px]">{src.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-label-md font-semibold text-[#0F172A]">{src.name}</h3>
                      <span className="text-xs text-[#64748B]">{src.type}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                    src.status === 'Connected' 
                      ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' 
                      : 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]'
                  }`}>
                    {src.status}
                  </span>
                </div>

                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-mono text-xs text-[#475569] mb-3 break-all">
                  {src.host}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs py-2 border-t border-b border-[#E2E8F0]">
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Latency</span>
                    <span className="font-mono font-medium text-[#0F172A]">{src.latency}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Last Sync</span>
                    <span className="text-[#0F172A] font-medium">{src.lastSync}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[11px]">Footprint</span>
                    <span className="text-[#0F172A] font-medium">{src.records}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center mt-3">
                <span className="text-xs text-[#64748B] font-mono">BTP HDI Secure Tunnel</span>
                <button 
                  onClick={() => testConnection(src.id)}
                  disabled={testingId === src.id}
                  className="px-3.5 py-1.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] transition-colors flex items-center gap-1.5"
                >
                  <span className={`material-symbols-outlined text-[14px] text-[#2563EB] ${testingId === src.id ? 'animate-spin' : ''}`}>
                    {testingId === src.id ? 'refresh' : 'speed'}
                  </span>
                  <span>{testingId === src.id ? 'Pinging...' : 'Ping Test'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
