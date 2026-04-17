'use client';

/**
 * Admin Upload Page
 * L5 — Frontend: Upload UI (backend L1–L4 enforce the real security)
 * Shows drag-and-drop PDF upload zone with law_area selector and real-time SSE job tracker.
 * Section 13.2: Upload UI requirements
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import api from '@/lib/api';

const LAW_AREAS = [
  'Solid Waste Management', 'Hazardous Waste', 'E-Waste', 'Plastic Waste',
  'Bio-Medical Waste', 'Construction Waste', 'Battery Waste',
  'Environmental Protection', 'Water Pollution', 'Air Pollution',
  'Noise Pollution', 'Forest Conservation', 'Wildlife Protection', 'Other',
];

type JobStatus = {
  job_id: string;
  status: string;
  stage: string;
  progress: number;
  error: string | null;
};

type UploadResult = {
  document_id: string;
  job_id: string;
  file_name: string;
};

export default function AdminUploadPage() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [lawArea, setLawArea] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load upload history on mount
  useEffect(() => {
    api.get('/admin/documents?limit=5')
      .then(r => setHistory(r.data.documents || []))
      .catch(() => {});
  }, [result]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === 'application/pdf') {
      setFile(dropped);
      setError(null);
    } else {
      setError('Only PDF files are accepted.');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) { setError('Please select a PDF file.'); return; }
    if (!lawArea) { setError('Please select a law area before uploading.'); return; }

    setError(null);
    setUploading(true);
    setResult(null);
    setJobStatus(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('law_area', lawArea);

    try {
      const res = await api.post('/admin/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadResult: UploadResult = {
        document_id: res.data.document_id,
        job_id: res.data.job_id,
        file_name: res.data.file_name,
      };
      setResult(uploadResult);
      setFile(null);
      setLawArea('');

      // Start SSE stream for job progress
      startJobStream(uploadResult.job_id);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const startJobStream = (jobId: string) => {
    // Close any existing stream
    eventSourceRef.current?.close();

    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:8000';
    const es = new EventSource(`${backendUrl}/admin/jobs/${jobId}/stream`, {
      withCredentials: true,
    });

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setJobStatus(data);
        if (data.status === 'completed' || data.status === 'failed') {
          es.close();
        }
      } catch {}
    };

    es.onerror = () => es.close();
    eventSourceRef.current = es;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div>
      <h1 className="admin-page-title">Upload Law Document</h1>
      <p className="admin-page-subtitle">
        Upload Indian Environmental Law Gazette (PDF only, max 50 MB). Admin access only.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
        {/* Upload panel */}
        <div>
          {error && (
            <div className="admin-alert admin-alert-error">
              ⚠️ {error}
            </div>
          )}

          {result && (
            <div className="admin-alert admin-alert-success">
              ✅ Upload successful! Processing document...
            </div>
          )}

          {/* Law area selector — REQUIRED before upload is enabled (Section 13.2) */}
          <div className="admin-form-group">
            <label className="admin-label">
              Law Area <span style={{ color: '#ef4444' }}>*</span>
              <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 8 }}>
                (Required before upload)
              </span>
            </label>
            <select
              className="admin-select"
              value={lawArea}
              onChange={e => setLawArea(e.target.value)}
            >
              <option value="">— Select law area —</option>
              {LAW_AREAS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Drop zone (Section 13.2) */}
          <div
            className={`admin-dropzone ${dragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              id="pdf-file-input"
            />
            {file ? (
              <>
                <div className="admin-dropzone-icon">📄</div>
                <div className="admin-dropzone-title">{file.name}</div>
                <div className="admin-dropzone-sub">
                  {formatBytes(file.size)} • Click to change
                </div>
              </>
            ) : (
              <>
                <div className="admin-dropzone-icon">📤</div>
                <div className="admin-dropzone-title">
                  Drop your PDF here or click to browse
                </div>
                <div className="admin-dropzone-sub">
                  PDF only • Maximum 50 MB • Admin upload only
                </div>
              </>
            )}
          </div>

          <button
            className="admin-btn admin-btn-primary"
            onClick={handleUpload}
            disabled={!file || !lawArea || uploading}
            style={{ marginTop: 16, width: '100%', justifyContent: 'center', padding: '12px 0' }}
            id="admin-upload-btn"
          >
            {uploading ? (
              <>
                <span className="admin-guard-spinner" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                Uploading...
              </>
            ) : (
              '📤 Upload Document'
            )}
          </button>
        </div>

        {/* Job tracker panel (Section 13.2) */}
        <div>
          {jobStatus && (
            <div className="admin-card">
              <div className="admin-card-title">Ingestion Progress</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>{jobStatus.stage}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#818cf8' }}>
                    {jobStatus.progress}%
                  </span>
                </div>
                <div className="admin-progress-wrap">
                  <div
                    className="admin-progress-bar"
                    style={{ width: `${jobStatus.progress}%` }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                {jobStatus.status === 'completed' && (
                  <div className="admin-alert admin-alert-success" style={{ margin: 0 }}>
                    ✅ Ingestion complete! Check Provisions tab for pending review items.
                  </div>
                )}
                {jobStatus.status === 'failed' && (
                  <div className="admin-alert admin-alert-error" style={{ margin: 0 }}>
                    ❌ {jobStatus.error || 'Ingestion failed.'}
                  </div>
                )}
                {jobStatus.status === 'running' && (
                  <div className="admin-alert admin-alert-info" style={{ margin: 0 }}>
                    ⚙️ Processing... Do not close this tab.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent uploads */}
          {history.length > 0 && (
            <div className="admin-card" style={{ marginTop: jobStatus ? 16 : 0 }}>
              <div className="admin-card-title">Recent Uploads</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map((doc: any) => (
                  <a
                    key={doc.id}
                    href={`/admin/documents/${doc.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{
                      padding: '10px 12px', borderRadius: 8,
                      background: 'rgba(99, 102, 241, 0.05)',
                      border: '1px solid rgba(99, 102, 241, 0.1)',
                      transition: 'border-color 0.15s',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#f1f5f9', marginBottom: 4 }}>
                        {doc.file_name}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{doc.law_area}</span>
                        <span className={`admin-badge admin-badge-${doc.status === 'processed' ? 'active' : doc.status === 'processing' ? 'processing' : 'failed'}`}>
                          {doc.status}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
