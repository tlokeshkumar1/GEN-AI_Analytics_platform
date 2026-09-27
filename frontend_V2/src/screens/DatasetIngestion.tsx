import React, { useState, useRef } from 'react';
import { SAMPLE_RECORDS } from '../data/mockData';

interface DatasetIngestionProps {
  onNavigate: (path: string) => void;
}

export const DatasetIngestion: React.FC<DatasetIngestionProps> = ({ onNavigate }) => {
  const [fileName, setFileName] = useState('SAC_Sales_Preprocessed.xlsx');
  const [recordCount, setRecordCount] = useState(3412);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Dataset Ingestion Complete · Ready for Analysis');
  const [syncTime, setSyncTime] = useState('Synchronized 4 mins ago');
  const [dragOver, setDragOver] = useState(false);
  const [healthCheckModal, setHealthCheckModal] = useState(false);
  const [apiDocsModal, setApiDocsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0].name);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0].name);
    }
  };

  const processSelectedFile = (name: string) => {
    setFileName(name);
    setIsSyncing(true);
    setSyncStatus(`Ingesting ${name}...`);
    setTimeout(() => {
      setIsSyncing(false);
      setRecordCount(prev => prev + Math.floor(Math.random() * 50) + 10);
      setSyncStatus('Dataset Ingestion Complete · Ready for Analysis');
      setSyncTime('Synchronized just now');
      showToast(`Successfully ingested and vectorized ${name}`);
    }, 1200);
  };

  const downloadSampleTemplate = () => {
    const csvContent = `OrderNumber,SalesDate,Region,Country,Category,Product,NetRevenueUSD,GrossMarginPercent,Quantity,UnitCostUSD,DistributionChannel,CustomerSegment
ORD-2025-9001,2025-01-10,North America,United States,Robotics & Automation,Industrial Robotic Arm X-400,24100.00,0.4820,1,12483.80,Direct Enterprise,Enterprise
ORD-2025-9002,2025-01-11,EMEA,Germany,Heavy Machinery,Heavy Forklift H-90 Tier-4,19400.00,0.4100,2,11446.00,VAR Partner,Mid-Market
ORD-2025-9003,2025-01-12,APAC,Japan,Material Handling & Storage,Automated Sorting System Pro,16400.00,0.4570,1,8905.20,OEM,Enterprise
ORD-2025-9004,2025-01-14,North America,Canada,Safety & Compliance,Safety Sensor Matrix 4 Enterprise,11800.00,0.3840,10,7268.80,Direct Enterprise,Public Sector
ORD-2025-9005,2025-01-15,Latin America,Brazil,Tools & Maintenance,Pneumatic Torque System PTX,8600.00,0.3610,5,5495.40,Digital Reseller,SMB`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'SAP_HANA_Sales_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Downloaded sample template (SAP_HANA_Sales_Template.csv)');
  };

  return (
    <div className="flex flex-col w-full gap-space-xl">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#111111] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 font-label-md text-label-md animate-in fade-in">
          <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
        <div className="flex flex-col max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-outline font-semibold">
              INGESTION PIPELINE · EXCEL / CSV TO HANA VECTORS
            </span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-semibold tracking-tight">
            Dataset Management & Ingestion
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
            Upload updated sales datasets to refresh in-memory analytics caching and sync HANA vector embeddings.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-space-sm self-start lg:self-auto">
          <button 
            onClick={downloadSampleTemplate}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-surface-container-low text-on-surface font-label-lg text-label-lg hover:bg-surface-container transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">download</span>
            <span>Download Sample Template (.xlsx)</span>
          </button>

          <button 
            onClick={() => setApiDocsModal(true)}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-surface-container-low text-on-surface font-label-lg text-label-lg hover:bg-surface-container transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">description</span>
            <span>API Ingestion Docs</span>
          </button>
        </div>
      </div>

      {/* Architectural Pipeline Stepper */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-[#eeeeec]">
        <div className="flex items-center justify-between mb-space-md">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
            Execution Lifecycle · Active Pipeline State
          </span>
          <span className="font-label-sm text-label-sm px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-medium">
            Cluster Worker: ID-09-V4
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
          {/* Step 1 */}
          <div className="flex items-center gap-space-md p-space-md rounded-xl bg-surface-container-low/70 border border-[#eeeeec]">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary text-[18px]">check</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm uppercase text-outline tracking-wider font-semibold">Step 01</span>
              <span className="font-body-md text-body-md text-on-surface font-medium truncate">Upload Source Data</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Parquet & XLSX Reader</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-space-md p-space-md rounded-xl bg-surface-container-low/70 border border-[#eeeeec]">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary text-[18px]">check</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm uppercase text-outline tracking-wider font-semibold">Step 02</span>
              <span className="font-body-md text-body-md text-on-surface font-medium truncate">Schema Validation & Typing</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">39 Metrics Verified</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-space-md p-space-md rounded-xl bg-surface-container-low/70 border border-[#eeeeec]">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary text-[18px]">check</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm uppercase text-outline tracking-wider font-semibold">Step 03</span>
              <span className="font-body-md text-body-md text-on-surface font-medium truncate">In-Memory Dataframe Caching</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Arrow IPC Shared Heap</span>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-center gap-space-md p-space-md rounded-xl bg-surface-container-low/70 border border-[#eeeeec]">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary text-[18px]">check</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm uppercase text-outline tracking-wider font-semibold">Step 04</span>
              <span className="font-body-md text-body-md text-on-surface font-medium truncate">HANA Vector Generation</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Cosine Distance Metric</span>
            </div>
          </div>
        </div>
      </div>

      {/* Drag-and-Drop Zone & Visual Ingestion Telemetry */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-stretch">
        <div 
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          className={`xl:col-span-8 bg-surface-container-lowest rounded-[20px] p-6 sm:p-10 md:p-14 shadow-sm flex flex-col items-center justify-center text-center relative group cursor-pointer transition-all border ${
            dragOver ? 'border-[#111111] bg-surface-container-low' : 'border-[#eeeeec]'
          }`}
        >
          <input 
            ref={fileInputRef}
            accept=".xlsx,.xls,.csv" 
            className="hidden" 
            type="file"
            onChange={handleFileInputChange}
          />

          <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-space-md group-hover:scale-105 transition-transform duration-300">
            <svg 
              className="w-8 h-8 text-on-surface" 
              fill="none" 
              stroke="currentColor" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="1.75" 
              viewBox="0 0 24 24"
            >
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
              <path d="M12 12v9"></path>
              <path d="m16 16-4-4-4 4"></path>
            </svg>
          </div>

          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold max-w-md">
            Drag and drop your Excel or CSV sales dataset here
          </h3>
          <p className="font-body-sm text-body-sm text-outline mt-2 mb-space-lg max-w-sm">
            Supported file formats: .xlsx, .xls, .csv (Maximum file size: 250MB)
          </p>

          <div className="flex flex-wrap items-center justify-center gap-space-sm">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="h-10 px-6 rounded-full bg-surface-container text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high transition-colors" 
              type="button"
            >
              Browse Local Files
            </button>
            <button 
              onClick={() => processSelectedFile(fileName)}
              disabled={isSyncing}
              className="h-10 px-6 rounded-full bg-primary text-on-primary font-label-lg text-label-lg hover:bg-neutral-800 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70" 
              type="button"
            >
              <span className={`material-symbols-outlined text-[16px] ${isSyncing ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>{isSyncing ? 'Ingesting Dataset...' : 'Ingest & Synchronize Dataset'}</span>
            </button>
          </div>

          <div className="mt-space-lg flex items-center gap-space-md text-outline flex-wrap justify-center">
            <span className="font-label-sm text-label-sm">HANA Vector Dimension: 1536</span>
            <span className="text-surface-variant">•</span>
            <span className="font-label-sm text-label-sm">Automatic Data Pre-sanitization</span>
            <span className="text-surface-variant">•</span>
            <span className="font-label-sm text-label-sm">BTP Secure Tunnel</span>
          </div>
        </div>

        {/* Live Pipeline Micro Visualizer */}
        <div className="xl:col-span-4 bg-surface-container-lowest rounded-[20px] p-space-lg shadow-sm flex flex-col justify-between border border-[#eeeeec]">
          <div>
            <div className="flex items-center justify-between mb-space-md">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                Ingestion Engine Telemetry
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Live</span>
            </div>

            <div className="flex flex-col gap-space-md">
              <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-1 border border-[#eeeeec]">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md text-on-surface font-medium">HANA Vector Buffer</span>
                  <span className="font-label-sm text-label-sm text-outline">98.4% capacity</span>
                </div>
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden mt-1">
                  <div className="bg-primary h-full rounded-full" style={{ width: '98.4%' }}></div>
                </div>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-1 border border-[#eeeeec]">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md text-on-surface font-medium">Arrow IPC In-Memory</span>
                  <span className="font-label-sm text-label-sm text-outline">284 MB Active</span>
                </div>
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden mt-1">
                  <div className="bg-secondary h-full rounded-full" style={{ width: '42%' }}></div>
                </div>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-1 border border-[#eeeeec]">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md text-on-surface font-medium">AI Core Embedding Worker</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">GPT-4o / ada-002 pool</span>
                </div>
                <span className="font-body-sm text-body-sm text-outline">Average latency: 41ms / batch (32 rows)</span>
              </div>
            </div>
          </div>

          <div className="pt-space-md mt-space-md bg-surface-container-low/50 -mx-space-lg -mb-space-lg p-space-lg rounded-b-[20px] border-t border-[#eeeeec]">
            <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[16px] text-on-surface">shield</span>
              <span className="font-medium text-on-surface">SOC-2 Type II & GDPR Validated Ingestion</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Cache Summary & Schema Card */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-[#eeeeec]">
        {/* Card Top Bar */}
        <div className="p-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container-lowest border-b border-[#eeeeec]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold">
                <span className={`w-2 h-2 rounded-full bg-primary ${isSyncing ? 'animate-ping' : ''}`}></span>
                <span>{syncStatus}</span>
              </span>
              <span className="font-label-sm text-label-sm text-outline">{syncTime}</span>
            </div>
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-1">
              Active Memory Footprint
            </span>
          </div>

          {/* Feedback Card CTA Buttons */}
          <div className="flex flex-wrap items-center gap-space-sm">
            <button 
              onClick={() => setHealthCheckModal(true)}
              className="h-9 px-4 rounded-full bg-surface-container-low text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors flex items-center gap-1.5" 
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>Run Consistency Health Check</span>
            </button>
            <button 
              onClick={() => onNavigate('executive-dashboard')}
              className="h-9 px-5 rounded-full bg-primary text-on-primary font-label-md text-label-md hover:bg-neutral-800 transition-colors flex items-center gap-1.5" 
            >
              <span className="material-symbols-outlined text-[16px]">dashboard</span>
              <span>Open Executive Dashboard</span>
            </button>
          </div>
        </div>

        {/* Metrics 4-Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-surface-container-high">
          <div className="bg-surface-container-lowest p-space-lg flex flex-col justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">File Name</span>
            <div className="my-space-xs">
              <div className="font-headline-sm text-headline-sm text-on-surface font-medium truncate" title={fileName}>
                {fileName}
              </div>
              <span className="font-body-sm text-body-sm text-outline">Standard Sheet 1</span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Source: Local Direct Upload</span>
          </div>

          <div className="bg-surface-container-lowest p-space-lg flex flex-col justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">Rows Ingested</span>
            <div className="my-space-xs">
              <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                {recordCount.toLocaleString()} Records
              </div>
              <span className="font-body-sm text-body-sm text-outline">0 corrupt rows dropped</span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface font-medium">100% Data Integrity</span>
          </div>

          <div className="bg-surface-container-lowest p-space-lg flex flex-col justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">Columns Indexed</span>
            <div className="my-space-xs">
              <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                39 Dimensions & Metrics
              </div>
              <span className="font-body-sm text-body-sm text-outline">27 Dim / 12 Fact</span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Indexed for Fast Aggregation</span>
          </div>

          <div className="bg-surface-container-lowest p-space-lg flex flex-col justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">Vector Embeddings</span>
            <div className="my-space-xs">
              <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                {recordCount.toLocaleString()} Embeddings
              </div>
              <span className="font-body-sm text-body-sm text-outline truncate" title="text-embedding-3-large">via text-embedding-3-large</span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface font-medium">HANA Vector Sync Complete</span>
          </div>
        </div>

        {/* Schema Preview Table */}
        <div className="p-space-lg bg-surface-container-lowest">
          <div className="flex items-center justify-between mb-space-md">
            <div className="flex items-center gap-space-sm">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                Schema Preview (First 5 Sample Records)
              </span>
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-on-surface">
                Live DataFrame Cache
              </span>
            </div>
            <span className="font-body-sm text-body-sm text-outline">Showing columns 1-6 of 39</span>
          </div>

          <div className="overflow-x-auto rounded-lg bg-surface-container-low border border-[#eeeeec]">
            <table className="w-full text-left font-body-sm text-body-sm">
              <thead>
                <tr className="bg-surface-container-high text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">OrderNumber</th>
                  <th className="py-3 px-4 font-semibold">SalesDate</th>
                  <th className="py-3 px-4 font-semibold">Region</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold text-right">NetRevenueUSD</th>
                  <th className="py-3 px-4 font-semibold text-right">GrossMarginPercent</th>
                </tr>
              </thead>
              <tbody className="text-on-surface divide-y divide-[#eeeeec]">
                {SAMPLE_RECORDS.map((rec) => (
                  <tr key={rec.orderNumber} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium">{rec.orderNumber}</td>
                    <td className="py-3.5 px-4 text-on-surface-variant font-mono">{rec.salesDate}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm">
                        {rec.region}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">{rec.category}</td>
                    <td className="py-3.5 px-4 text-right font-medium font-mono">{rec.netRevenue}</td>
                    <td className="py-3.5 px-4 text-right font-mono">{rec.grossMarginPercent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Editorial System Audit Banner */}
      <div className="p-space-lg rounded-xl bg-surface-container-low flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md shadow-sm border border-[#eeeeec]">
        <div className="flex items-center gap-space-md">
          <span className="material-symbols-outlined text-outline text-[24px]">terminal</span>
          <div className="flex flex-col">
            <span className="font-label-md text-label-md font-semibold text-on-surface uppercase tracking-wider">
              Vector Store Hash: 7b41e89f81a74d22c · Synchronized
            </span>
            <p className="font-body-sm text-body-sm text-outline">
              RAG Chat Context has automatically received updated memory pointers. No service reload required.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-space-sm self-stretch md:self-auto justify-end">
          <span className="font-label-sm text-label-sm text-outline font-medium">MTA Build: v1.0.0-PROD</span>
        </div>
      </div>

      {/* Health Check Modal */}
      {healthCheckModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div 
            className="fixed inset-0" 
            onClick={() => setHealthCheckModal(false)} 
          />
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 z-10 border border-[#dadad8]">
            <div className="flex items-center justify-between pb-3 border-b border-[#eeeeec]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">verified</span>
                <h3 className="font-headline-sm text-headline-sm font-semibold">HANA Data Consistency Report</h3>
              </div>
              <button 
                onClick={() => setHealthCheckModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3 font-body-sm">
              <div className="p-3 rounded-xl bg-[#f4f4f2] flex items-center justify-between">
                <div>
                  <div className="font-medium text-[#1a1c1b]">Column Types & Nullability</div>
                  <div className="text-xs text-[#747878]">39 schema definitions validated</div>
                </div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">100% Pass</span>
              </div>

              <div className="p-3 rounded-xl bg-[#f4f4f2] flex items-center justify-between">
                <div>
                  <div className="font-medium text-[#1a1c1b]">Vector Index Dimension Align</div>
                  <div className="text-xs text-[#747878]">1536-dimensional float32 embeddings</div>
                </div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">100% Pass</span>
              </div>

              <div className="p-3 rounded-xl bg-[#f4f4f2] flex items-center justify-between">
                <div>
                  <div className="font-medium text-[#1a1c1b]">Calculated Fields Invariants</div>
                  <div className="text-xs text-[#747878]">GrossMarginUSD = NetRevenueUSD - UnitCostUSD</div>
                </div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Verified</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#eeeeec] flex justify-end">
              <button 
                onClick={() => setHealthCheckModal(false)}
                className="px-5 py-2 rounded-full bg-primary text-white text-xs font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Ingestion Docs Modal */}
      {apiDocsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div 
            className="fixed inset-0" 
            onClick={() => setApiDocsModal(false)} 
          />
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 z-10 border border-[#dadad8] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#eeeeec]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">code</span>
                <h3 className="font-headline-sm text-headline-sm font-semibold">REST API Ingestion Specification</h3>
              </div>
              <button 
                onClick={() => setApiDocsModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-4 font-body-sm">
              <p className="text-[#444748]">
                Push high-frequency streaming sales batches directly into SAP HANA Cloud Vector Store using the BTP REST endpoint.
              </p>

              <div>
                <span className="font-label-sm uppercase text-outline block mb-1">cURL Ingestion Payload</span>
                <pre className="p-4 rounded-xl bg-[#1c1b1b] text-[#f1f1ef] font-mono text-xs overflow-x-auto leading-relaxed">
{`curl -X POST https://zeus.hana.prod.eu-central-1.hanacloud.ondemand.com/api/v1/ingest \\
  -H "Authorization: Bearer <SAP_BTP_OAUTH_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tableName": "SALES_FACT_ENTERPRISE",
    "generateVectors": true,
    "batchSize": 500,
    "records": [
      {
        "OrderNumber": "ORD-2025-9921",
        "SalesDate": "2025-01-20",
        "Region": "EMEA",
        "Category": "Robotics & Automation",
        "NetRevenueUSD": 24800.00,
        "GrossMarginPercent": 0.4820
      }
    ]
  }'`}
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low text-xs text-outline">
                Automated deduplication based on <code>OrderNumber</code> primary key. Cosine index updates synchronously within 50ms.
              </div>
            </div>

            <div className="pt-3 border-t border-[#eeeeec] flex justify-end">
              <button 
                onClick={() => setApiDocsModal(false)}
                className="px-5 py-2 rounded-full bg-primary text-white text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
