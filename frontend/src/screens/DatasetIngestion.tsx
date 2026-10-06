import React, { useState, useRef, useEffect, useCallback } from 'react';
import { uploadDatasetFile } from '../services/uploadService';
import { getApiErrorMessage } from '../services/api';
import { DatasetSelector } from '../components/dataset/DatasetSelector';
import { DatasetActionPanel } from '../components/dataset/DatasetActionPanel';
import { DatasetViewTable } from '../components/dataset/DatasetViewTable';
import { DatasetEditView } from '../components/dataset/DatasetEditView';
import { DatasetAppendView } from '../components/dataset/DatasetAppendView';
import { DatasetDeleteDialog } from '../components/dataset/DatasetDeleteDialog';
import { DatasetItem, DatasetAction, DATASET_ACTIONS } from '../types/dataset';
import { getDatasets, getUserPermissions, rollbackDataset, activateDataset, reindexDataset } from '../services/datasetService';

interface DatasetIngestionProps { onNavigate: (path: string) => void; }

export const DatasetIngestion: React.FC<DatasetIngestionProps> = ({ onNavigate }) => {
  const [activeDataset, setActiveDataset] = useState<DatasetItem | null>(null);
  const [activeAction, setActiveAction] = useState<DatasetAction>(DATASET_ACTIONS.VIEW);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState('Upload a dataset to get started, or select an existing dataset.');
  const [error, setError] = useState<string | null>(null);
  const [restoreVersion, setRestoreVersion] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const permissions = getUserPermissions();

  const selectDataset = (dataset: DatasetItem) => {
    setActiveDataset(dataset);
    setActiveAction(DATASET_ACTIONS.VIEW);
    setRestoreVersion('');
    const url = new URL(window.location.href);
    url.searchParams.set('datasetId', dataset.id);
    window.history.replaceState({}, '', url.toString());
  };

  const clearDataset = () => {
    setActiveDataset(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('datasetId');
    window.history.replaceState({}, '', url.toString());
  };

  useEffect(() => {
    let cancelled = false;
    getDatasets().then(list => {
      if (cancelled) return;
      const requested = new URLSearchParams(window.location.search).get('datasetId');
      const selected = list.find(d => d.id === requested) ?? list.find(d => d.isActive);
      if (selected) selectDataset(selected);
    }).catch(err => { if (!cancelled) setError(getApiErrorMessage(err, 'Failed to load datasets.')); });
    return () => { cancelled = true; };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshTrigger(n => n + 1);
    try {
      const list = await getDatasets();
      if (activeDataset) setActiveDataset(list.find(d => d.id === activeDataset.id) ?? null);
    } catch (err) { setError(getApiErrorMessage(err, 'Failed to refresh dataset.')); }
  }, [activeDataset]);

  const upload = async (file: File) => {
    if (isBusy || !permissions.canAppend) return;
    setIsBusy(true);
    setError(null);
    setMessage(`Saving and indexing ${file.name}...`);
    try {
      const result = await uploadDatasetFile(file);
      if (result.status !== 'success') throw new Error(result.message);
      setMessage(result.message);
      if (result.dataset) selectDataset(result.dataset);
      setRefreshTrigger(n => n + 1);
    } catch (err) { setError(getApiErrorMessage(err, 'Upload failed.')); setMessage('Upload did not complete.'); }
    finally { setIsBusy(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const performVersionAction = async (action: 'rollback' | 'activate' | 'reindex') => {
    if (!activeDataset) return;
    setIsBusy(true);
    setError(null);
    try {
      const result = action === 'rollback' ? await rollbackDataset(activeDataset.id, Number(restoreVersion))
        : action === 'activate' ? await activateDataset(activeDataset.id) : await reindexDataset(activeDataset.id);
      setMessage(result.message);
      setActiveDataset(result.dataset);
      setRestoreVersion('');
      setRefreshTrigger(n => n + 1);
    } catch (err) { setError(getApiErrorMessage(err, 'Version operation failed.')); }
    finally { setIsBusy(false); }
  };

  return (
    <div className="flex flex-col w-full gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Dataset Management & Ingestion</h1>
          <p className="mt-2 text-slate-600">Upload, append, edit, or restore saved versions. Chat uses the active dataset version.</p>
        </div>
        <DatasetSelector selectedDataset={activeDataset} onSelectDataset={selectDataset}
          onClearSelection={clearDataset} refreshTrigger={refreshTrigger} />
      </div>

      <div role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">{message}</div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) void upload(e.dataTransfer.files[0]); }}
        className={`rounded-2xl border-2 border-dashed p-6 bg-white ${dragOver ? 'border-blue-500' : 'border-slate-300'}`}>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={e => { if (e.target.files?.[0]) void upload(e.target.files[0]); }} />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900">Drop an Excel or CSV file here</h2>
            <p className="mt-1 text-sm text-slate-600">Uploading the same filename saves a new complete version. Use Append to add rows.</p>
          </div>
          <button type="button" disabled={isBusy || !permissions.canAppend} onClick={() => fileInputRef.current?.click()}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {isBusy ? 'Processing...' : 'Upload dataset'}
          </button>
        </div>
      </div>

      {activeDataset ? <>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">{activeDataset.currentFilename ?? activeDataset.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{activeDataset.rowCount.toLocaleString()} rows · {activeDataset.columnCount} columns · Version {activeDataset.currentVersion}</p>
              <p className="mt-1 text-xs text-slate-500">Updated {new Date(activeDataset.lastUpdated).toLocaleString()}</p>
            </div>
            <div className="text-sm text-slate-600">
              <p>{activeDataset.isActive ? 'Active for chat and analytics' : 'Select “Use in chat” to activate'}</p>
              <p className="mt-1">Embeddings: {activeDataset.embeddingStatus ?? 'Pending'} · {activeDataset.embeddingCount ?? 0} chunks</p>
              <p className="mt-1">HANA sync: {activeDataset.hanaSyncStatus ?? 'Pending'}</p>
            </div>
          </div>
          {activeDataset.embeddingStatus !== 'Ready' && <p className="text-sm text-amber-800">Chat currently retrieves this version’s source text. Retry indexing to enable embedding search.</p>}
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="dataset-version" className="text-sm text-slate-600">Saved version</label>
            <select id="dataset-version" value={restoreVersion} onChange={e => setRestoreVersion(e.target.value)} disabled={isBusy}
              className="rounded-lg border border-slate-300 bg-white p-2 text-sm">
              <option value="">Select a version to restore</option>
              {activeDataset.versions?.map(v => <option key={v.version} value={v.version} disabled={v.version === activeDataset.currentVersion}>
                V{v.version} · {v.rowCount} rows · {v.operation}{v.version === activeDataset.currentVersion ? ' (current)' : ''}
              </option>)}
            </select>
            <button type="button" disabled={!restoreVersion || isBusy || !permissions.canEdit} onClick={() => void performVersionAction('rollback')}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-40">Restore version</button>
            {!activeDataset.isActive && <button type="button" disabled={isBusy || !permissions.canEdit} onClick={() => void performVersionAction('activate')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40">Use in chat</button>}
            <button type="button" disabled={isBusy || !permissions.canEdit} onClick={() => void performVersionAction('reindex')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40">Refresh embeddings</button>
            <button type="button" onClick={() => onNavigate('ai-dashboards-rag-chat')} className="px-3 py-2 text-sm text-blue-700">Open RAG chat</button>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          <div className="w-full lg:w-72 shrink-0"><DatasetActionPanel dataset={activeDataset} activeAction={activeAction}
            onSelectAction={setActiveAction} permissions={permissions} isBusy={isBusy} /></div>
          <div key={`${activeDataset.id}-${activeDataset.currentVersion}-${refreshTrigger}`} className="flex-1 min-w-0 w-full">
            {activeAction === DATASET_ACTIONS.VIEW && <DatasetViewTable dataset={activeDataset} onRefresh={() => void refresh()} />}
            {activeAction === DATASET_ACTIONS.EDIT && <DatasetEditView dataset={activeDataset} onSaved={() => void refresh()} onToast={setMessage} />}
            {activeAction === DATASET_ACTIONS.APPEND && <DatasetAppendView dataset={activeDataset} onAppended={() => void refresh()} onToast={setMessage} />}
            {activeAction === DATASET_ACTIONS.DELETE && <>
              <DatasetViewTable dataset={activeDataset} />
              <DatasetDeleteDialog dataset={activeDataset} isOpen onClose={() => setActiveAction(DATASET_ACTIONS.VIEW)}
                onDatasetDeleted={() => { clearDataset(); setRefreshTrigger(n => n + 1); }} onRowsDeleted={() => void refresh()} onToast={setMessage} />
            </>}
          </div>
        </div>
      </> : <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">No dataset selected. Uploaded datasets appear in the selector.</div>}
    </div>
  );
};
