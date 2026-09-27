import React, { useState } from 'react';

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

  const testConnection = (id: string) => {
    setTestingId(id);
    setTimeout(() => {
      setTestingId(null);
      setSources(prev => prev.map(s => s.id === id ? { ...s, lastSync: 'Just now', latency: '11ms' } : s));
    }, 700);
  };

  return (
    <div className="flex flex-col w-full gap-space-xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            <span className="font-label-sm uppercase tracking-widest text-outline font-semibold">
              INFRASTRUCTURE CONNECTORS · BTP INTEGRATION SUITE
            </span>
          </div>
          <h1 className="font-headline-xl text-on-surface font-semibold tracking-tight">
            Data Sources & HDI Containers
          </h1>
          <p className="font-body-md text-on-surface-variant mt-1">
            Active connections to SAP HANA Cloud, S/4HANA transactional endpoints, and AI Core vector services.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start md:self-end mt-2 md:mt-0">
          <button 
            onClick={() => onNavigate('upload-dataset')}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors shadow-sm border border-[#e2e3e1] whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[16px] text-outline">add_link</span>
            <span>Add Data Connection</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {sources.map(src => (
          <div 
            key={src.id}
            className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-[#eeeeec] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface">
                    <span className="material-symbols-outlined text-[18px]">{src.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-label-md font-semibold text-on-surface">{src.name}</h3>
                    <span className="text-xs text-outline">{src.type}</span>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  src.status === 'Connected' ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container text-outline'
                }`}>
                  {src.status}
                </span>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl font-mono text-xs text-outline mb-3 break-all">
                {src.host}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs py-2 border-t border-b border-[#eeeeec]">
                <div>
                  <span className="text-outline block">Latency</span>
                  <span className="font-mono font-medium text-on-surface">{src.latency}</span>
                </div>
                <div>
                  <span className="text-outline block">Last Sync</span>
                  <span className="text-on-surface font-medium">{src.lastSync}</span>
                </div>
                <div>
                  <span className="text-outline block">Footprint</span>
                  <span className="text-on-surface font-medium">{src.records}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center mt-3">
              <span className="text-xs text-outline font-mono">BTP HDI Secure Tunnel</span>
              <button 
                onClick={() => testConnection(src.id)}
                disabled={testingId === src.id}
                className="px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-xs font-medium transition-colors flex items-center gap-1"
              >
                <span className={`material-symbols-outlined text-[14px] ${testingId === src.id ? 'animate-spin' : ''}`}>
                  {testingId === src.id ? 'refresh' : 'speed'}
                </span>
                <span>{testingId === src.id ? 'Pinging...' : 'Ping Test'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
