'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  designation: string | null;
  org_name: string | null;
  org_type: string | null;
  state: string | null;
  plan: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string | null;
  last_login: string | null;
  signup_ip: string | null;
  last_login_ip: string | null;
  query_count: number;
}

interface Query {
  id: string;
  query_text: string;
  answer: string;
  created_at: string | null;
  latency_total_ms: number | null;
  cache_hit: boolean;
  user_email: string;
  user_name: string | null;
}

interface HealthData {
  db: string;
  redis: string;
  total_users: number;
  active_users_24h: number;
  new_users_24h: number;
  new_users_7d: number;
  queries_24h: number;
  queries_7d: number;
  total_queries: number;
  avg_latency_ms_24h: number;
  cache_hit_rate_pct: number;
  cpu_percent: number | null;
  memory_percent: number | null;
  memory_used_gb: number | null;
  memory_total_gb: number | null;
  timestamp: string;
}

interface AnalyticsData {
  daily_queries: { day: string; count: number }[];
  top_users: { email: string; name: string | null; query_count: number }[];
  by_state: { state: string; count: number }[];
}

interface AuditLog {
  id: string;
  admin: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: string | null;
  created_at: string | null;
}

interface Announcement {
  id: string;
  message: string;
  created_by: string;
  created_at: string;
}

interface Correction {
  id: string;
  correction: string;
  created_by: string;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────

function adminConfig(extra?: Record<string, unknown>) {
  return extra ?? {};
}

function fmt(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function exportCSV(users: User[]) {
  const headers = ['Email','Name','Organisation','Org Type','State','Plan','Status','Queries','Joined','Last Login','Signup IP','Last IP'];
  const rows = users.map(u => [
    u.email, u.name ?? '', u.org_name ?? '', u.org_type ?? '', u.state ?? '',
    u.plan, u.is_active ? 'Active' : 'Inactive', u.query_count,
    u.created_at ? new Date(u.created_at).toLocaleDateString() : '',
    u.last_login ? new Date(u.last_login).toLocaleDateString() : '',
    u.signup_ip ?? '', u.last_login_ip ?? '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `niyam-users-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />;
}

// ── Bar Chart ──────────────────────────────────────────────────

function BarChart({ data }: { data: { day: string; count: number }[] }) {
  if (!data.length) return <p className="text-slate-500 text-sm py-4">No query data in the last 30 days.</p>;
  const max = Math.max(...data.map(d => d.count), 1);
  const W = 600; const H = 120;
  const colW = (W - 32) / data.length;
  const barW = Math.max(3, colW - 2);
  const show = (i: number) => i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 24}`} className="overflow-visible">
      {data.map((d, i) => {
        const h = Math.max(2, Math.round((d.count / max) * H));
        const x = 16 + i * colW;
        const y = H - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx={2} fill="#3b82f6" opacity={0.75} />
            {d.count > 0 && h > 14 && (
              <text x={x + barW / 2} y={y + 10} textAnchor="middle" fill="#e2e8f0" fontSize={8}>{d.count}</text>
            )}
            {show(i) && (
              <text x={x + barW / 2} y={H + 16} textAnchor="middle" fill="#64748b" fontSize={8}>
                {d.day.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Edit User Modal ────────────────────────────────────────────

function EditUserModal({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (u: User) => void }) {
  const [name, setName] = useState(user.name ?? '');
  const [plan, setPlan] = useState(user.plan);
  const [isActive, setIsActive] = useState(user.is_active);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    setSaving(true); setErr('');
    try {
      const res = await api.put(`/admin/users/${user.id}`, { name, plan, is_active: isActive }, adminConfig());
      onSave({ ...user, ...res.data.user }); onClose();
    } catch (e: any) { setErr(e.response?.data?.detail || 'Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Edit — {user.email}</h3>
        {err && <p className="text-red-400 text-sm mb-3">{err}</p>}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Plan</label>
            <select value={plan} onChange={e => setPlan(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm">
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 accent-blue-500" />
            <label htmlFor="active" className="text-sm text-slate-300">Account active</label>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Query Detail Modal ─────────────────────────────────────────

function QueryModal({ query, onClose }: { query: Query; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <p className="text-xs text-slate-400">{query.user_email} · {fmt(query.created_at)}</p>
          <button onClick={onClose} className="text-slate-400 hover:text-white ml-4 text-lg">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 space-y-4">
          <div>
            <p className="text-xs font-medium text-blue-400 uppercase tracking-wider mb-1">Query</p>
            <p className="text-slate-200 text-sm leading-relaxed bg-slate-900 rounded-lg p-3">{query.query_text}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-1">Answer</p>
            <p className="text-slate-300 text-sm leading-relaxed bg-slate-900 rounded-lg p-3 whitespace-pre-wrap">{query.answer}</p>
          </div>
        </div>
        <div className="flex gap-3 text-xs text-slate-500 mt-4 pt-4 border-t border-slate-700">
          <span>Latency: {query.latency_total_ms ?? '—'}ms</span>
          <span>Cache: {query.cache_hit ? 'hit' : 'miss'}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function AdminDashboard() {
  const [tab, setTab] = useState<'users' | 'analytics' | 'audit' | 'health' | 'corrections'>('users');

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [userTotal, setUserTotal] = useState(0);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [suspendingUserId, setSuspendingUserId] = useState<string | null>(null);

  // Inline queries panel
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [queries, setQueries] = useState<Query[]>([]);
  const [queriesLoading, setQueriesLoading] = useState(false);
  const [viewQuery, setViewQuery] = useState<Query | null>(null);
  const [deletingQueryId, setDeletingQueryId] = useState<string | null>(null);

  // Analytics
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Audit log
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Health
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Announcement
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [announcementInput, setAnnouncementInput] = useState('');
  const [announcementSaving, setAnnouncementSaving] = useState(false);

  // Corrections
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [correctionsLoading, setCorrectionsLoading] = useState(false);
  const [correctionInput, setCorrectionInput] = useState('');
  const [correctionSaving, setCorrectionSaving] = useState(false);
  const [deletingCorrectionId, setDeletingCorrectionId] = useState<string | null>(null);
  const [correctionsLocked, setCorrectionsLocked] = useState(true);
  const [correctionsUnlocking, setCorrectionsUnlocking] = useState(false);
  const [correctionsPassword, setCorrectionsPassword] = useState('');
  const [correctionsPasswordError, setCorrectionsPasswordError] = useState('');

  // ── Loaders ───────────────────────────────────────────────

  const loadUsers = useCallback(async (search = '') => {
    setUsersLoading(true);
    try {
      const res = await api.get('/admin/users', adminConfig({ params: { search: search || undefined, limit: 200 } }));
      setUsers(res.data.users); setUserTotal(res.data.total);
    } catch { } finally { setUsersLoading(false); }
  }, []);

  const loadUserQueries = useCallback(async (userId: string) => {
    setQueriesLoading(true); setQueries([]);
    try {
      const res = await api.get('/admin/queries', adminConfig({ params: { user_id: userId, limit: 200 } }));
      setQueries(res.data.queries);
    } catch { } finally { setQueriesLoading(false); }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await api.get('/admin/analytics', adminConfig());
      setAnalytics(res.data);
    } catch { } finally { setAnalyticsLoading(false); }
  }, []);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await api.get('/admin/audit', adminConfig());
      setAuditLogs(res.data.logs);
    } catch { } finally { setAuditLoading(false); }
  }, []);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await api.get('/admin/health', adminConfig());
      setHealth(res.data);
    } catch { } finally { setHealthLoading(false); }
  }, []);

  const loadAnnouncement = useCallback(async () => {
    try {
      const res = await api.get('/admin/announcement', adminConfig());
      setAnnouncement(res.data.announcement);
      if (res.data.announcement) setAnnouncementInput(res.data.announcement.message);
    } catch { }
  }, []);

  const loadCorrections = useCallback(async () => {
    setCorrectionsLoading(true);
    try {
      const res = await api.get('/admin/corrections', adminConfig());
      setCorrections(res.data.corrections);
    } catch { } finally { setCorrectionsLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'analytics') loadAnalytics();
    if (tab === 'audit') loadAudit();
    if (tab === 'health') { loadHealth(); loadAnnouncement(); }
    if (tab === 'corrections') { loadCorrections(); setCorrectionsLocked(true); setCorrectionInput(''); setCorrectionsPassword(''); setCorrectionsPasswordError(''); }
  }, [tab]);

  // ── Duplicate IP detection ────────────────────────────────
  const dupIPs = new Set<string>();
  const ipCount: Record<string, number> = {};
  users.forEach(u => { if (u.signup_ip) ipCount[u.signup_ip] = (ipCount[u.signup_ip] || 0) + 1; });
  Object.entries(ipCount).forEach(([ip, c]) => { if (c > 1) dupIPs.add(ip); });

  // ── Handlers ──────────────────────────────────────────────

  const handleSelectUser = (user: User) => {
    if (selectedUser?.id === user.id) { setSelectedUser(null); setQueries([]); }
    else { setSelectedUser(user); loadUserQueries(user.id); }
  };

  const handleSuspend = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSuspendingUserId(userId);
    try {
      const res = await api.post(`/admin/users/${userId}/suspend`, {}, adminConfig());
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: res.data.is_active } : u));
      if (selectedUser?.id === userId) setSelectedUser(prev => prev ? { ...prev, is_active: res.data.is_active } : null);
      loadAudit();
    } catch (e: any) { alert(e.response?.data?.detail || 'Suspend failed.'); }
    finally { setSuspendingUserId(null); }
  };

  const handleDeleteUser = async (userId: string, email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete user ${email} and ALL their data? This cannot be undone.`)) return;
    setDeletingUserId(userId);
    try {
      await api.delete(`/admin/users/${userId}`, adminConfig());
      setUsers(prev => prev.filter(u => u.id !== userId));
      setUserTotal(prev => prev - 1);
      if (selectedUser?.id === userId) { setSelectedUser(null); setQueries([]); }
    } catch (e: any) { alert(e.response?.data?.detail || 'Delete failed.'); }
    finally { setDeletingUserId(null); }
  };

  const handleDeleteQuery = async (queryId: string) => {
    if (!confirm('Delete this query record?')) return;
    setDeletingQueryId(queryId);
    try {
      await api.delete(`/admin/queries/${queryId}`, adminConfig());
      setQueries(prev => prev.filter(q => q.id !== queryId));
      if (selectedUser) setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, query_count: u.query_count - 1 } : u));
    } catch (e: any) { alert(e.response?.data?.detail || 'Delete failed.'); }
    finally { setDeletingQueryId(null); }
  };

  const handleSetAnnouncement = async () => {
    if (!announcementInput.trim()) return;
    setAnnouncementSaving(true);
    try {
      await api.post('/admin/announcement', { message: announcementInput.trim() }, adminConfig());
      await loadAnnouncement();
      loadAudit();
    } catch { } finally { setAnnouncementSaving(false); }
  };

  const handleClearAnnouncement = async () => {
    if (!confirm('Clear the current announcement?')) return;
    try {
      await api.delete('/admin/announcement', adminConfig());
      setAnnouncement(null); setAnnouncementInput('');
      loadAudit();
    } catch { }
  };

  const handleUnlockCorrections = async () => {
    if (!correctionsPassword.trim()) { setCorrectionsPasswordError('Enter your password.'); return; }
    setCorrectionsUnlocking(true);
    setCorrectionsPasswordError('');
    try {
      await api.post('/admin/corrections/unlock', { password: correctionsPassword }, adminConfig());
      setCorrectionsLocked(false);
      setCorrectionsPassword('');
      loadAudit();
    } catch (e: any) {
      setCorrectionsPasswordError(e.response?.data?.detail || 'Incorrect password.');
    } finally { setCorrectionsUnlocking(false); }
  };

  const handleAddCorrection = async () => {
    if (!correctionInput.trim()) return;
    setCorrectionSaving(true);
    try {
      await api.post('/admin/corrections', { correction: correctionInput.trim() }, adminConfig());
      setCorrectionInput('');
      await loadCorrections();
    } catch (e: any) { alert(e.response?.data?.detail || 'Could not save correction.'); }
    finally { setCorrectionSaving(false); }
  };

  const handleDeleteCorrection = async (id: string) => {
    if (!confirm('Remove this correction? The model will stop using it immediately.')) return;
    setDeletingCorrectionId(id);
    try {
      await api.delete(`/admin/corrections/${id}`, adminConfig());
      setCorrections(prev => prev.filter(c => c.id !== id));
    } catch (e: any) { alert(e.response?.data?.detail || 'Delete failed.'); }
    finally { setDeletingCorrectionId(null); }
  };

  // ── Tab button ─────────────────────────────────────────────
  const TabBtn = ({ id, label, icon }: { id: typeof tab; label: string; icon: React.ReactNode }) => (
    <button onClick={() => setTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        tab === id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}>
      {icon}{label}
    </button>
  );

  const actionColor: Record<string, string> = {
    user_edited: 'text-blue-400', user_deleted: 'text-red-400',
    user_suspended: 'text-amber-400', user_unsuspended: 'text-emerald-400',
    query_deleted: 'text-red-400', announcement_set: 'text-purple-400',
    announcement_cleared: 'text-slate-400',
    correction_added: 'text-amber-400', correction_deleted: 'text-slate-400',
    correction_tab_unlocked: 'text-orange-400',
  };

  return (
    <>
      {editUser && (
        <EditUserModal user={editUser} onClose={() => setEditUser(null)}
          onSave={(updated) => setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))} />
      )}
      {viewQuery && <QueryModal query={viewQuery} onClose={() => setViewQuery(null)} />}

      {/* ── Tab bar ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <TabBtn id="users" label={`Users (${userTotal})`} icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>} />
        <TabBtn id="analytics" label="Analytics" icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>} />
        <TabBtn id="audit" label="Audit Log" icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>} />
        <TabBtn id="health" label="System Health" icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>} />
        <TabBtn id="corrections" label={`Corrections${corrections.length ? ` (${corrections.length})` : ''}`} icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>} />
        <div className="ml-auto flex gap-2">
          {tab === 'health' && <button onClick={loadHealth} className="text-xs text-slate-400 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg transition-colors">Refresh</button>}
          {tab === 'audit' && <button onClick={loadAudit} className="text-xs text-slate-400 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg transition-colors">Refresh</button>}
          {tab === 'analytics' && <button onClick={loadAnalytics} className="text-xs text-slate-400 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg transition-colors">Refresh</button>}
          {tab === 'corrections' && <button onClick={loadCorrections} className="text-xs text-slate-400 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg transition-colors">Refresh</button>}
        </div>
      </div>

      {/* ── USERS TAB ─────────────────────────────────────── */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap items-center">
            <form onSubmit={e => { e.preventDefault(); loadUsers(userSearch); }} className="flex gap-2 flex-1">
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                placeholder="Search by email or name…"
                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder:text-slate-500 flex-1 max-w-sm" />
              <button type="submit" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors">Search</button>
              {userSearch && <button type="button" onClick={() => { setUserSearch(''); loadUsers(''); setSelectedUser(null); setQueries([]); }}
                className="px-3 py-2 text-slate-400 hover:text-white text-sm">Clear</button>}
            </form>
            <button onClick={() => exportCSV(users)} disabled={!users.length}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700/30 hover:bg-emerald-700/50 border border-emerald-700/50 text-emerald-400 text-xs rounded-lg transition-colors disabled:opacity-40">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
          </div>

          {dupIPs.size > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {dupIPs.size} duplicate signup IP{dupIPs.size > 1 ? 's' : ''} detected — rows highlighted below. May indicate shared network or duplicate accounts.
            </div>
          )}

          <p className="text-xs text-slate-500">Click a row to view that user's queries.</p>

          {usersLoading ? (
            <div className="text-slate-500 text-sm py-8 text-center">Loading users…</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50">
                    {['Email','Name','Organisation','Plan','Status','Queries','Joined','Last Login','Signup IP','Last IP','Actions'].map(h => (
                      <th key={h} className="text-left text-xs text-slate-400 font-medium px-3 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 && <tr><td colSpan={11} className="text-center text-slate-500 py-10">No users found.</td></tr>}
                  {users.map(u => {
                    const isDupIP = u.signup_ip ? dupIPs.has(u.signup_ip) : false;
                    return (
                      <tr key={u.id} onClick={() => handleSelectUser(u)}
                        className={`border-b border-slate-800/50 cursor-pointer transition-colors ${
                          selectedUser?.id === u.id ? 'bg-blue-600/10 border-l-2 border-l-blue-500' :
                          isDupIP ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-slate-900/40'
                        }`}>
                        <td className="px-3 py-2.5 text-slate-200 font-medium text-xs">
                          <div className="flex items-center gap-1.5">
                            {isDupIP && <span title="Duplicate signup IP" className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
                            {u.email}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 text-xs">{u.name ?? '—'}</td>
                        <td className="px-3 py-2.5 text-slate-400 text-xs max-w-[120px] truncate">{u.org_name ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            u.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-300' :
                            u.plan === 'pro' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-700 text-slate-400'
                          }`}>{u.plan}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {u.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`font-medium text-xs ${u.query_count > 0 ? 'text-blue-400' : 'text-slate-500'}`}>{u.query_count}</span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">{fmt(u.created_at)}</td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">{fmt(u.last_login)}</td>
                        <td className={`px-3 py-2.5 font-mono text-xs ${isDupIP ? 'text-amber-400' : 'text-slate-500'}`}>{u.signup_ip ?? '—'}</td>
                        <td className="px-3 py-2.5 text-slate-500 font-mono text-xs">{u.last_login_ip ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button onClick={e => { e.stopPropagation(); setEditUser(u); }}
                              className="text-xs text-slate-400 hover:text-white border border-slate-700 px-2 py-1 rounded transition-colors">Edit</button>
                            <button onClick={e => handleSuspend(u.id, e)} disabled={suspendingUserId === u.id}
                              className={`text-xs border px-2 py-1 rounded transition-colors disabled:opacity-50 ${
                                u.is_active ? 'text-amber-400 border-amber-900/50 hover:bg-amber-900/20' : 'text-emerald-400 border-emerald-900/50 hover:bg-emerald-900/20'
                              }`}>
                              {suspendingUserId === u.id ? '…' : u.is_active ? 'Suspend' : 'Restore'}
                            </button>
                            <button onClick={e => handleDeleteUser(u.id, u.email, e)} disabled={deletingUserId === u.id}
                              className="text-xs text-red-500 hover:text-red-400 border border-red-900/50 px-2 py-1 rounded transition-colors disabled:opacity-50">
                              {deletingUserId === u.id ? '…' : 'Del'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Inline queries panel */}
          {selectedUser && (
            <div className="rounded-xl border border-blue-500/30 bg-slate-900/60">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span className="text-sm font-medium text-white">Queries — <span className="text-blue-400">{selectedUser.email}</span></span>
                  {!queriesLoading && <span className="text-xs text-slate-500">{queries.length} records</span>}
                </div>
                <button onClick={() => { setSelectedUser(null); setQueries([]); }} className="text-slate-500 hover:text-white text-lg">✕</button>
              </div>
              {queriesLoading ? (
                <div className="py-8 text-center text-slate-500 text-sm">Loading…</div>
              ) : queries.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">No queries yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/30">
                        {['#','Query','Date','Latency','Cache','Actions'].map(h => (
                          <th key={h} className="text-left text-xs text-slate-400 font-medium px-3 py-2">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queries.map((q, i) => (
                        <tr key={q.id} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                          <td className="px-3 py-2.5 text-slate-600 text-xs">{i + 1}</td>
                          <td className="px-3 py-2.5 text-slate-300 max-w-md"><span className="line-clamp-2 text-xs">{q.query_text}</span></td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">{fmt(q.created_at)}</td>
                          <td className="px-3 py-2.5 text-slate-500 text-xs">{q.latency_total_ms ?? '—'}ms</td>
                          <td className="px-3 py-2.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${q.cache_hit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                              {q.cache_hit ? 'hit' : 'miss'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex gap-1.5">
                              <button onClick={() => setViewQuery(q)} className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900/50 px-2 py-0.5 rounded transition-colors">View</button>
                              <button onClick={() => handleDeleteQuery(q.id)} disabled={deletingQueryId === q.id}
                                className="text-xs text-red-500 hover:text-red-400 border border-red-900/50 px-2 py-0.5 rounded transition-colors disabled:opacity-50">
                                {deletingQueryId === q.id ? '…' : 'Del'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ANALYTICS TAB ─────────────────────────────────── */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          {analyticsLoading && !analytics && <div className="text-slate-500 text-sm py-8 text-center">Loading analytics…</div>}
          {analytics && (
            <>
              {/* Daily query chart */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">Query Volume — Last 30 Days</h3>
                <BarChart data={analytics.daily_queries} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top users */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">Top Users by Queries</h3>
                  {analytics.top_users.length === 0 ? (
                    <p className="text-slate-500 text-sm">No data yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {analytics.top_users.map((u, i) => {
                        const pct = analytics.top_users[0].query_count > 0
                          ? Math.round((u.query_count / analytics.top_users[0].query_count) * 100) : 0;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-slate-600 text-xs w-4 text-right">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-slate-300 text-xs truncate">{u.email}</span>
                                <span className="text-blue-400 text-xs font-medium ml-2">{u.query_count}</span>
                              </div>
                              <div className="bg-slate-800 rounded-full h-1">
                                <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Users by state */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">Users by State</h3>
                  {analytics.by_state.length === 0 ? (
                    <p className="text-slate-500 text-sm">No state data yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {analytics.by_state.map((s, i) => {
                        const pct = analytics.by_state[0].count > 0
                          ? Math.round((s.count / analytics.by_state[0].count) * 100) : 0;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-slate-300 text-xs">{s.state}</span>
                                <span className="text-emerald-400 text-xs font-medium">{s.count}</span>
                              </div>
                              <div className="bg-slate-800 rounded-full h-1">
                                <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── AUDIT LOG TAB ─────────────────────────────────── */}
      {tab === 'audit' && (
        <div>
          {auditLoading && !auditLogs.length && <div className="text-slate-500 text-sm py-8 text-center">Loading audit log…</div>}
          {!auditLoading && auditLogs.length === 0 && <div className="text-slate-500 text-sm py-8 text-center">No actions recorded yet.</div>}
          {auditLogs.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50">
                    {['Time','Admin','Action','Target','Detail'].map(h => (
                      <th key={h} className="text-left text-xs text-slate-400 font-medium px-3 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id} className="border-b border-slate-800/40 hover:bg-slate-900/30">
                      <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">{fmt(log.created_at)}</td>
                      <td className="px-3 py-2.5 text-slate-300 text-xs font-medium">{log.admin}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-medium ${actionColor[log.action] ?? 'text-slate-400'}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 text-xs">
                        {log.target_type && <span className="capitalize">{log.target_type}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 text-xs max-w-xs truncate">{log.detail ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── HEALTH TAB ────────────────────────────────────── */}
      {tab === 'health' && (
        <div className="space-y-6">
          {healthLoading && !health && <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>}
          {health && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Database', value: health.db, ok: health.db === 'healthy' },
                  { label: 'Redis Cache', value: health.redis, ok: health.redis === 'healthy' },
                  { label: 'CPU', value: health.cpu_percent != null ? `${health.cpu_percent}%` : 'N/A', ok: health.cpu_percent == null || health.cpu_percent < 80 },
                  { label: 'Memory', value: health.memory_percent != null ? `${health.memory_percent}%` : 'N/A', ok: health.memory_percent == null || health.memory_percent < 85 },
                ].map(item => (
                  <div key={item.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                    <p className="text-sm font-medium flex items-center">
                      <StatusDot ok={item.ok} />
                      <span className={item.ok ? 'text-emerald-400' : 'text-red-400'}>{item.value}</span>
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Users</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Users', value: health.total_users },
                    { label: 'Active (24h)', value: health.active_users_24h },
                    { label: 'New Today', value: health.new_users_24h },
                    { label: 'New This Week', value: health.new_users_7d },
                  ].map(item => (
                    <div key={item.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                      <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                      <p className="text-2xl font-bold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Queries</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Queries', value: health.total_queries },
                    { label: 'Queries (24h)', value: health.queries_24h },
                    { label: 'Queries (7d)', value: health.queries_7d },
                    { label: 'Avg Latency (24h)', value: `${health.avg_latency_ms_24h}ms` },
                  ].map(item => (
                    <div key={item.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                      <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                      <p className="text-2xl font-bold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Cache</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">Cache Hit Rate (24h)</p>
                    <p className="text-2xl font-bold text-white">{health.cache_hit_rate_pct}%</p>
                    <div className="mt-2 bg-slate-800 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${health.cache_hit_rate_pct}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600">Last updated: {new Date(health.timestamp).toLocaleString()}</p>
            </>
          )}

          {/* ── Announcement Manager ─────────────────────── */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">Announcement Banner</h3>
            <p className="text-xs text-slate-500 mb-3">This message will appear as a banner on all user dashboards.</p>
            {announcement && (
              <div className="mb-3 px-4 py-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm flex items-start justify-between gap-3">
                <span>{announcement.message}</span>
                <span className="text-xs text-slate-500 whitespace-nowrap">set {fmt(announcement.created_at)}</span>
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={announcementInput}
                onChange={e => setAnnouncementInput(e.target.value)}
                placeholder="Type an announcement message…"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
              <button onClick={handleSetAnnouncement} disabled={announcementSaving || !announcementInput.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50">
                {announcementSaving ? '…' : 'Publish'}
              </button>
              {announcement && (
                <button onClick={handleClearAnnouncement}
                  className="px-4 py-2 bg-slate-700 hover:bg-red-900/50 text-red-400 text-sm rounded-lg transition-colors">
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CORRECTIONS TAB ───────────────────────────────── */}
      {tab === 'corrections' && (
        <div className="space-y-6">

          {/* ── Lock banner ───────────────────────────────────── */}
          {correctionsLocked ? (
            <div className="bg-slate-900 border border-amber-900/40 rounded-xl p-6 flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm mb-1">Corrections are locked</p>
                <p className="text-slate-500 text-xs leading-relaxed max-w-sm">
                  This section directly controls what the model says. Enter your admin password to unlock.
                  Every unlock and every change is recorded in the Audit Log.
                </p>
              </div>
              <div className="w-full max-w-xs flex flex-col gap-2">
                <input
                  type="password"
                  value={correctionsPassword}
                  onChange={e => { setCorrectionsPassword(e.target.value); setCorrectionsPasswordError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleUnlockCorrections()}
                  placeholder="Enter your admin password"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-500 text-center"
                />
                {correctionsPasswordError && (
                  <p className="text-red-400 text-xs">{correctionsPasswordError}</p>
                )}
                <button
                  onClick={handleUnlockCorrections}
                  disabled={correctionsUnlocking || !correctionsPassword.trim()}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {correctionsUnlocking ? 'Verifying…' : 'Unlock'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-900/20 border border-amber-700/40 rounded-lg">
              <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              <p className="text-amber-300 text-xs flex-1">Unlocked — all changes are being recorded in the Audit Log.</p>
              <button
                onClick={() => { setCorrectionsLocked(true); setCorrectionInput(''); }}
                className="text-xs text-slate-400 hover:text-white border border-slate-700 px-3 py-1 rounded-lg transition-colors"
              >
                Lock
              </button>
            </div>
          )}

          {/* ── Add correction (only when unlocked) ───────────── */}
          {!correctionsLocked && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-1">Tell the model it got something wrong</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Write in plain language what was wrong and what the correct answer is.
                From this moment the model will use your correction whenever someone asks something similar.
              </p>
              <textarea
                value={correctionInput}
                onChange={e => setCorrectionInput(e.target.value)}
                rows={5}
                placeholder={`Example:\n"When someone asks about GST registration for e-commerce sellers, you keep saying the threshold exemption applies — that is wrong. The correct answer is: all e-commerce operators must register under GST regardless of their turnover. Section 24(ix) of the CGST Act 2017 mandates this with no exceptions."`}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 resize-none leading-relaxed mb-3"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">{correctionInput.length} / 5000 characters</span>
                <button
                  onClick={handleAddCorrection}
                  disabled={correctionSaving || correctionInput.trim().length < 10}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
                >
                  {correctionSaving ? 'Saving…' : 'Save Correction'}
                </button>
              </div>
            </div>
          )}

          {/* ── Active corrections list ─────────────────────── */}
          <div>
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
              Active Corrections ({corrections.length})
            </h3>

            {correctionsLoading && corrections.length === 0 && (
              <p className="text-slate-500 text-sm py-6 text-center">Loading…</p>
            )}

            {!correctionsLoading && corrections.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-10 text-center">
                <p className="text-slate-500 text-sm">No corrections yet.</p>
                <p className="text-slate-600 text-xs mt-1">Unlock and add one above — the model will use it immediately for similar questions.</p>
              </div>
            )}

            <div className="space-y-3">
              {corrections.map((c) => (
                <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-slate-200 text-sm leading-relaxed flex-1 whitespace-pre-wrap">{c.correction}</p>
                    {!correctionsLocked && (
                      <button
                        onClick={() => handleDeleteCorrection(c.id)}
                        disabled={deletingCorrectionId === c.id}
                        className="shrink-0 px-3 py-1.5 text-xs text-red-400 border border-red-900/40 rounded-lg hover:bg-red-900/20 transition-colors disabled:opacity-40"
                      >
                        {deletingCorrectionId === c.id ? '…' : 'Remove'}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-3">
                    Added by <span className="text-slate-500">{c.created_by}</span> · {fmt(c.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
