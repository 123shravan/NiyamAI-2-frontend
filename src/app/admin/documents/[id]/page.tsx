'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function DocumentDetailPage() {
  const params = useParams();
  const docId = params?.id as string;
  const [doc, setDoc] = useState<any>(null);
  const [provisions, setProvisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (docId) loadDocument();
  }, [docId]);

  const loadDocument = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/documents/${docId}`);
      setDoc(res.data.document);
      setProvisions(res.data.provisions || []);
    } catch {}
    finally { setLoading(false); }
  };

  const handleStatusChange = async (provId: string, newStatus: string) => {
    try {
      await api.patch(`/admin/provisions/${provId}`, { status: newStatus });
      setProvisions(prev =>
        prev.map(p => p.id === provId ? { ...p, status: newStatus } : p)
      );
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to update.');
    }
  };

  const handleEdit = (prov: any) => {
    setEditingId(prov.id);
    setEditText(prov.provision_text);
  };

  const handleSaveEdit = async (provId: string) => {
    setSaving(true);
    try {
      const res = await api.patch(`/admin/provisions/${provId}`, { provision_text: editText });
      setProvisions(prev =>
        prev.map(p => p.id === provId ? { ...p, ...res.data.provision } : p)
      );
      setEditingId(null);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const badgeClass = (status: string) => {
    const m: Record<string, string> = { active: 'active', pending_review: 'pending', superseded: 'failed' };
    return `admin-badge admin-badge-${m[status] || 'pending'}`;
  };

  if (loading) return (
    <div className="admin-empty">
      <div className="admin-guard-spinner" style={{ margin: '0 auto' }} />
    </div>
  );

  if (!doc) return (
    <div className="admin-empty">
      <div className="admin-empty-icon">❌</div>
      <div className="admin-empty-title">Document not found</div>
    </div>
  );

  const pendingCount = provisions.filter(p => p.status === 'pending_review').length;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin/documents" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>
          ← Back to Documents
        </Link>
      </div>

      <h1 className="admin-page-title" style={{ marginBottom: 4 }}>{doc.file_name}</h1>
      <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
        <span className="admin-badge admin-badge-processing" style={{ fontSize: 12, padding: '4px 10px' }}>
          {doc.law_area}
        </span>
        <span className="admin-badge" style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #334155', color: '#94a3b8' }}>
          {provisions.length} provisions
        </span>
        {pendingCount > 0 && (
          <span className="admin-badge admin-badge-pending" style={{ fontSize: 12, padding: '4px 10px' }}>
            ⚠️ {pendingCount} pending review
          </span>
        )}
      </div>

      {pendingCount > 0 && (
        <div className="admin-alert admin-alert-info" style={{ marginBottom: 24 }}>
          ⚖️ {pendingCount} provision{pendingCount > 1 ? 's' : ''} need review. Approve or reject each one below.
          Pending provisions are NOT active — they will not appear in query results until approved.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {provisions.map((prov) => (
          <div key={prov.id} className="admin-card" style={{
            borderColor: prov.status === 'pending_review' ? 'rgba(245,158,11,0.3)' : undefined,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1 }}>
                {editingId === prov.id ? (
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    className="admin-input"
                    style={{ minHeight: 100, resize: 'vertical', marginBottom: 8 }}
                  />
                ) : (
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: '#f1f5f9', margin: 0 }}>
                    {prov.provision_text}
                  </p>
                )}
                {prov.provision_ref && (
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
                    Ref: {prov.provision_ref}
                  </div>
                )}
                {prov.confidence && (
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    Confidence: {(prov.confidence * 100).toFixed(0)}%
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
                <span className={badgeClass(prov.status)}>{prov.status.replace('_', ' ')}</span>

                {editingId === prov.id ? (
                  <>
                    <button
                      className="admin-btn admin-btn-primary"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => handleSaveEdit(prov.id)}
                      disabled={saving}
                    >
                      {saving ? 'Saving…' : '✓ Save'}
                    </button>
                    <button
                      className="admin-btn admin-btn-ghost"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {prov.status === 'pending_review' && (
                      <button
                        className="admin-btn admin-btn-primary"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={() => handleStatusChange(prov.id, 'active')}
                      >
                        ✅ Approve
                      </button>
                    )}
                    {prov.status === 'pending_review' && (
                      <button
                        className="admin-btn admin-btn-danger"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={() => handleStatusChange(prov.id, 'superseded')}
                      >
                        ✗ Reject
                      </button>
                    )}
                    <button
                      className="admin-btn admin-btn-ghost"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => handleEdit(prov)}
                      id={`edit-prov-${prov.id}`}
                    >
                      ✏️ Edit
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
