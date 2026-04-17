'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Analytics {
  totals: {
    total_provisions: number;
    active_provisions: number;
    pending_provisions: number;
  };
  document_count: number;
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/analytics')
      .then(r => setAnalytics(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: 'Total Documents',
      value: analytics?.document_count ?? '—',
      color: '',
    },
    {
      label: 'Total Provisions',
      value: analytics?.totals?.total_provisions ?? '—',
      color: '',
    },
    {
      label: 'Active Provisions',
      value: analytics?.totals?.active_provisions ?? '—',
      color: 'success',
    },
    {
      label: 'Pending Review',
      value: analytics?.totals?.pending_provisions ?? '—',
      color: 'warn',
    },
  ];

  return (
    <div>
      <h1 className="admin-page-title">Admin Dashboard</h1>
      <p className="admin-page-subtitle">
        Overview of the Niyam AI document library and ingestion status.
      </p>

      {loading ? (
        <div className="admin-empty">
          <div className="admin-guard-spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : (
        <>
          <div className="admin-stats-grid">
            {stats.map((s) => (
              <div key={s.label} className="admin-stat-card">
                <div className="admin-stat-label">{s.label}</div>
                <div className={`admin-stat-value ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="admin-card">
            <div className="admin-card-title">Quick Actions</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="/admin/upload" className="admin-btn admin-btn-primary">📤 Upload PDF</a>
              <a href="/admin/provisions" className="admin-btn admin-btn-ghost">⚖️ Review Provisions</a>
              <a href="/admin/documents" className="admin-btn admin-btn-ghost">📁 Document Library</a>
              <a href="/admin/analytics" className="admin-btn admin-btn-ghost">📊 Analytics</a>
            </div>
          </div>

          <div className="admin-card" style={{ marginTop: 16 }}>
            <div className="admin-card-title">Security Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { layer: 'L1', name: 'Database RLS', desc: 'PostgreSQL row-level security on documents + provisions tables' },
                { layer: 'L2', name: 'API Middleware', desc: 'require_admin_role on every /admin/* route with live DB check' },
                { layer: 'L3', name: 'JWT Role Claim', desc: 'RS256-signed is_admin claim embedded at login from DB' },
                { layer: 'L4', name: 'Storage Policy', desc: 'Supabase Storage bucket "pdfs" — admin upload only' },
                { layer: 'L5', name: 'Frontend Guard', desc: 'Next.js middleware + AdminGuard component (UX only)' },
                { layer: 'L6', name: 'Audit Log', desc: 'Every upload attempt recorded in upload_audit_log table' },
              ].map((l) => (
                <div key={l.layer} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  background: 'rgba(34, 197, 94, 0.05)',
                  borderRadius: 8,
                  border: '1px solid rgba(34, 197, 94, 0.15)',
                }}>
                  <span style={{
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    color: 'white', fontSize: 10, fontWeight: 700,
                    padding: '2px 6px', borderRadius: 4, minWidth: 26,
                    textAlign: 'center',
                  }}>{l.layer}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#4ade80' }}>{l.name} ✓</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{l.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
