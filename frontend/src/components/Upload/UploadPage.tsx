import React, { useState } from 'react';
import { UploadCloud, CheckCircle } from 'lucide-react';
import { uploadDatasetFile } from '../../services/upload';
import type { UploadResponse } from '../../services/upload';

export const UploadPageComponent: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadDatasetFile(file);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Upload Dataset</h1>
        <p className="text-xs text-slate-500 mt-1">Upload updated Excel (.xlsx) or CSV files into the analytics pipeline</p>
      </div>

      <div className="glass-panel p-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl">
        <UploadCloud className="w-12 h-12 text-sky-500 mb-3" />
        <p className="text-sm font-medium text-slate-700">Select dataset file to upload</p>
        <p className="text-xs text-slate-400 mt-1 mb-4">Supported formats: .xlsx, .csv</p>
        
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 mb-4"
        />

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all disabled:opacity-50"
        >
          {uploading ? 'Processing File...' : 'Upload & Process Dataset'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="font-semibold">{result.message}</p>
            <p className="text-xs text-emerald-600">Processed {result.rows_processed} records from {result.filename}</p>
          </div>
        </div>
      )}
    </div>
  );
};
