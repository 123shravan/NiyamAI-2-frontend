'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);
  const [purgeMsg, setPurgeMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get('/admin/analytics')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePurgeCache = async () => {
    if (!confirm('Purge the Redis answer cache? All cached answers will be regenerated on next query.')) return;
    setPurging(true);
    try {
      const res = await api.post('/admin/cache/purge');
      setPurgeMsg(res.data.message);
    } catch (e: any) {
      setPurgeMsg(e.response?.data?.detail || 'Failed to purge cache.');
    } finally {
      setPurging(false);
    }
  };

  const LAW_AREA_COLORS = [
    '#6366f1', '#818cf8', '#4f46e5', '#7c3aed', '#9333ea',
    '#a855f7', '#c026d3', '#db2777', '#e11d48', '#14b8a6',
  ];

  return (
    <div>
      <h1 className="admin-page-title">Analytics & System</h1>
      <p className="admin-page-subtitle">
        Provision statistics, ingestion history, and system controls.
      </p>

      {loading ? (
        <div className="admin-empty">
          <div className="admin-guard-spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : !data ? (
        <div className="admin-alert admin-alert-error">Failed to load analytics.</div>
      ) : (
        <>
          {/* Totals */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-label">Documents</div>
              <div className="admin-stat-value">{data.document_count ?? 0}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label">Total Provisions</div>
              <div className="admin-stat-value">{data.totals?.total_provisions ?? 0}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label">Active</div>
              <div className="admin-stat-value success">{data.totals?.active_provisions ?? 0}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label">Pending Review</div>
              <div className="admin-stat-value warn">{data.totals?.pending_provisions ?? 0}</div>
            </div>
          </div>

          {/* By law area */}
          <div className="admin-card" style={{ marginBottom: 16 }}>
            <div className="admin-card-title">Provisions by Law Area</div>
            {data.provisions_by_law_area?.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: 14 }}>No provisions yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(data.provisions_by_law_area || []).map((row: any, i: number) => {
                  const total = data.totals?.total_provisions || 1;
                  const pct = Math.round((row.provision_count / total) * 100);
                  return (
                    <div key={row.law_area}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#f1f5f9' }}>{row.law_area}</span>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#94a3b8' }}>
                          <span style={{ color: '#4ade80' }}>{row.active_count} active</span>
                          {row.pending_count > 0 && (
                            <span style={{ color: '#fbbf24' }}>{row.pending_count} pending</span>
                          )}
                          <span>{row.provision_count} total</span>
                        </div>
                      </div>
                      <div className="admin-progress-wrap">
                        <div
                          className="admin-progress-bar"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${LAW_AREA_COLORS[i % LAW_AREA_COLORS.length]}, ${LAW_AREA_COLORS[(i + 1) % LAW_AREA_COLORS.length]})`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* System controls */}
          <div className="admin-card">
            <div className="admin-card-title">System Controls</div>

            {purgeMsg && (
              <div className="admin-alert admin-alert-success" style={{ marginBottom: 16 }}>
                {purgeMsg}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 20px', borderRadius: 10,
                background: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.15)',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>
                    Redis Answer Cache
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    Purge all cached query answers. Next query will regenerate from the corpus.
                  </div>
                </div>
                <button
                  className="admin-btn admin-btn-danger"
                  onClick={handlePurgeCache}
                  disabled={purging}
                  id="purge-cache-btn"
                  style={{ marginLeft: 24, whiteSpace: 'nowrap' }}
                >
                  {purging ? 'Purging…' : '🗑 Purge Cache'}
                </button>
              </div>

              <div style={{
                padding: '16px 20px', borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.03)',
                border: '1px solid rgba(239, 68, 68, 0.1)',
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>
                  Audit Log
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                  Every upload attempt is permanently recorded in <code style={{ color: '#818cf8' }}>upload_audit_log</code>.
                  Records cannot be deleted via the application.
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#94a3b8' }}>
                  <span>📋 upload_success</span>
                  <span>⚠️ upload_rejected_not_admin</span>
                  <span>🔐 suspicious_repeated_attempt</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
