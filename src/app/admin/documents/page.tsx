'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rollbackConfirm, setRollbackConfirm] = useState<string | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/documents?limit=100');
      setDocuments(res.data.documents || []);
    } catch {}
    finally { setLoading(false); }
  };

  const handleRollback = async (docId: string) => {
    setRollbackLoading(true);
    try {
      await api.delete(`/admin/documents/${docId}/rollback`);
      setRollbackConfirm(null);
      await loadDocuments();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Rollback failed.');
    } finally {
      setRollbackLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      processed: 'active', processing: 'processing',
      failed: 'failed', rolled_back: 'pending',
    };
    return `admin-badge admin-badge-${map[status] || 'pending'}`;
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 className="admin-page-title" style={{ marginBottom: 4 }}>Document Library</h1>
          <p className="admin-page-subtitle" style={{ marginBottom: 0 }}>
            All uploaded law PDFs. Click a document to view and edit its provisions.
          </p>
        </div>
        <Link href="/admin/upload" className="admin-btn admin-btn-primary">
          📤 Upload New
        </Link>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="admin-empty">
            <div className="admin-guard-spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : documents.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">📁</div>
            <div className="admin-empty-title">No documents yet</div>
            <p>Upload your first law PDF to get started.</p>
            <Link href="/admin/upload" className="admin-btn admin-btn-primary" style={{ marginTop: 16 }}>
              📤 Upload PDF
            </Link>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Law Area</th>
                  <th>Status</th>
                  <th>Provisions</th>
                  <th>Pending</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <Link
                        href={`/admin/documents/${doc.id}`}
                        style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 500 }}
                      >
                        {doc.file_name}
                      </Link>
                    </td>
                    <td><span style={{ fontSize: 13, color: '#94a3b8' }}>{doc.law_area}</span></td>
                    <td><span className={statusBadge(doc.status)}>{doc.status}</span></td>
                    <td style={{ textAlign: 'center' }}>{doc.provision_count ?? 0}</td>
                    <td style={{ textAlign: 'center' }}>
                      {doc.pending_count > 0 ? (
                        <span className="admin-badge admin-badge-pending">{doc.pending_count}</span>
                      ) : (
                        <span style={{ color: '#4ade80', fontSize: 13 }}>✓</span>
                      )}
                    </td>
                    <td style={{ fontSize: 13, color: '#94a3b8' }}>
                      {fmt(doc.created_at)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link
                          href={`/admin/documents/${doc.id}`}
                          className="admin-btn admin-btn-ghost"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                        >
                          View
                        </Link>
                        {doc.status !== 'rolled_back' && (
                          <button
                            className="admin-btn admin-btn-danger"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => setRollbackConfirm(doc.id)}
                            id={`rollback-btn-${doc.id}`}
                          >
                            Rollback
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rollback confirmation modal (Section 13.2) */}
      {rollbackConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200,
        }}>
          <div className="admin-card" style={{ maxWidth: 420, width: '90%' }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#f87171' }}>
              ⚠️ Confirm Rollback
            </div>
            <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24 }}>
              Are you sure? This will deactivate all provisions from this document.
              The action will be recorded in the audit log.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="admin-btn admin-btn-danger"
                onClick={() => handleRollback(rollbackConfirm)}
                disabled={rollbackLoading}
                id="confirm-rollback-btn"
              >
                {rollbackLoading ? 'Rolling back...' : 'Yes, Rollback'}
              </button>
              <button
                className="admin-btn admin-btn-ghost"
                onClick={() => setRollbackConfirm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
