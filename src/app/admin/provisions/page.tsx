'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function AdminProvisionsPage() {
  const [provisions, setProvisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending_review');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadProvisions();
  }, [filter]);

  const loadProvisions = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/provisions?status_filter=${filter}&limit=200`);
      setProvisions(res.data.provisions || []);
    } catch {}
    finally { setLoading(false); }
  };

  const handleStatus = async (provId: string, newStatus: string) => {
    setSaving(provId);
    try {
      await api.patch(`/admin/provisions/${provId}`, { status: newStatus });
      setProvisions(prev => prev.filter(p => p.id !== provId));
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to update.');
    } finally {
      setSaving(null);
    }
  };

  const handleBulkApprove = async () => {
    const pending = provisions.filter(p => p.status === 'pending_review');
    for (const p of pending) {
      await handleStatus(p.id, 'active');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 className="admin-page-title" style={{ marginBottom: 4 }}>Provisions Review</h1>
          <p className="admin-page-subtitle" style={{ marginBottom: 0 }}>
            Review, approve, and manage extracted law provisions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {filter === 'pending_review' && provisions.length > 0 && (
            <button className="admin-btn admin-btn-primary" onClick={handleBulkApprove} id="bulk-approve-btn">
              ✅ Approve All ({provisions.length})
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[
          { value: 'pending_review', label: '⏳ Pending Review' },
          { value: 'active', label: '✅ Active' },
          { value: 'superseded', label: '✗ Rejected' },
        ].map(tab => (
          <button
            key={tab.value}
            className={`admin-btn ${filter === tab.value ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
            onClick={() => setFilter(tab.value)}
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-empty">
          <div className="admin-guard-spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : provisions.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">✅</div>
          <div className="admin-empty-title">
            {filter === 'pending_review' ? 'No provisions pending review' : 'No provisions found'}
          </div>
          {filter === 'pending_review' && (
            <p style={{ fontSize: 14, color: '#94a3b8' }}>All provisions have been reviewed.</p>
          )}
        </div>
      ) : (
        <div className="admin-card">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Provision</th>
                  <th>Source Document</th>
                  <th>Law Area</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {provisions.map((prov) => (
                  <tr key={prov.id}>
                    <td style={{ maxWidth: 400 }}>
                      <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: '#f1f5f9' }}>
                        {prov.provision_text?.slice(0, 200)}{prov.provision_text?.length > 200 ? '…' : ''}
                      </p>
                      {prov.provision_ref && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                          {prov.provision_ref}
                        </div>
                      )}
                    </td>
                    <td>
                      <a
                        href={`/admin/documents/${prov.document_id}`}
                        style={{ color: '#818cf8', fontSize: 12, textDecoration: 'none' }}
                      >
                        {prov.file_name}
                      </a>
                    </td>
                    <td style={{ fontSize: 12, color: '#94a3b8' }}>{prov.law_area}</td>
                    <td style={{ textAlign: 'center', fontSize: 13 }}>
                      {prov.confidence ? `${(prov.confidence * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td>
                      <span className={`admin-badge admin-badge-${prov.status === 'active' ? 'active' : prov.status === 'pending_review' ? 'pending' : 'failed'}`}>
                        {prov.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      {prov.status === 'pending_review' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="admin-btn admin-btn-primary"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            disabled={saving === prov.id}
                            onClick={() => handleStatus(prov.id, 'active')}
                          >
                            Approve
                          </button>
                          <button
                            className="admin-btn admin-btn-danger"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            disabled={saving === prov.id}
                            onClick={() => handleStatus(prov.id, 'superseded')}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {prov.status === 'active' && (
                        <button
                          className="admin-btn admin-btn-ghost"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          disabled={saving === prov.id}
                          onClick={() => handleStatus(prov.id, 'superseded')}
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
