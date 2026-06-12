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

// ── Helpers ────────────────────────────────────────────────────

function fmt(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
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
    setSaving(true);
    setErr('');
    try {
      const res = await api.put(`/admin/users/${user.id}`, { name, plan, is_active: isActive }, { withCredentials: true });
      onSave({ ...user, ...res.data.user });
      onClose();
    } catch (e: any) {
      setErr(e.response?.data?.detail || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Edit User — {user.email}</h3>
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
            <input type="checkbox" id="active" checked={isActive} onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-blue-500" />
            <label htmlFor="active" className="text-sm text-slate-300">Account active</label>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
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
          <div>
            <p className="text-xs text-slate-400">{query.user_email} · {fmt(query.created_at)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white ml-4">✕</button>
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
  const [tab, setTab] = useState<'users' | 'queries' | 'health'>('users');

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [userTotal, setUserTotal] = useState(0);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Queries state
  const [queries, setQueries] = useState<Query[]>([]);
  const [queryUserFilter, setQueryUserFilter] = useState('');
  const [queriesLoading, setQueriesLoading] = useState(false);
  const [queryTotal, setQueryTotal] = useState(0);
  const [viewQuery, setViewQuery] = useState<Query | null>(null);
  const [deletingQueryId, setDeletingQueryId] = useState<string | null>(null);

  // Health state
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // ── Load users ─────────────────────────────────────────────
  const loadUsers = useCallback(async (search = '') => {
    setUsersLoading(true);
    try {
      const res = await api.get('/admin/users', { params: { search: search || undefined, limit: 200 }, withCredentials: true });
      setUsers(res.data.users);
      setUserTotal(res.data.total);
    } catch { /* handled by layout redirect */ }
    finally { setUsersLoading(false); }
  }, []);

  // ── Load queries ───────────────────────────────────────────
  const loadQueries = useCallback(async (userId = '') => {
    setQueriesLoading(true);
    try {
      const params: any = { limit: 200 };
      if (userId) params.user_id = userId;
      const res = await api.get('/admin/queries', { params, withCredentials: true });
      setQueries(res.data.queries);
      setQueryTotal(res.data.total);
    } catch { }
    finally { setQueriesLoading(false); }
  }, []);

  // ── Load health ────────────────────────────────────────────
  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await api.get('/admin/health', { withCredentials: true });
      setHealth(res.data);
    } catch { }
    finally { setHealthLoading(false); }
  }, []);

  // Initial load on tab switch
  useEffect(() => {
    if (tab === 'users') loadUsers(userSearch);
    if (tab === 'queries') loadQueries();
    if (tab === 'health') loadHealth();
  }, [tab]);

  // ── Handlers ──────────────────────────────────────────────

  const handleUserSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(userSearch);
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Delete user ${email} and ALL their data? This cannot be undone.`)) return;
    setDeletingUserId(userId);
    try {
      await api.delete(`/admin/users/${userId}`, { withCredentials: true });
      setUsers(prev => prev.filter(u => u.id !== userId));
      setUserTotal(prev => prev - 1);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Delete failed.');
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleDeleteQuery = async (queryId: string) => {
    if (!confirm('Delete this query record?')) return;
    setDeletingQueryId(queryId);
    try {
      await api.delete(`/admin/queries/${queryId}`, { withCredentials: true });
      setQueries(prev => prev.filter(q => q.id !== queryId));
      setQueryTotal(prev => prev - 1);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Delete failed.');
    } finally {
      setDeletingQueryId(null);
    }
  };

  const handleViewUserQueries = (userId: string) => {
    setQueryUserFilter(userId);
    setTab('queries');
    loadQueries(userId);
  };

  // ── Tab button ─────────────────────────────────────────────
  const TabBtn = ({ id, label, icon }: { id: typeof tab; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        tab === id
          ? 'bg-blue-600 text-white'
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <>
      {/* Modals */}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={(updated) => setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))}
        />
      )}
      {viewQuery && <QueryModal query={viewQuery} onClose={() => setViewQuery(null)} />}

      {/* Tab bar */}
      <div className="flex items-center gap-2 mb-6">
        <TabBtn id="users" label={`Users (${userTotal})`} icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        } />
        <TabBtn id="queries" label={`Queries (${queryTotal})`} icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        } />
        <TabBtn id="health" label="System Health" icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        } />

        <div className="ml-auto">
          {tab === 'health' && (
            <button onClick={loadHealth} className="text-xs text-slate-400 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg transition-colors">
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* ── USERS TAB ─────────────────────────────────────── */}
      {tab === 'users' && (
        <div>
          <form onSubmit={handleUserSearchSubmit} className="flex gap-2 mb-4">
            <input
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search by email or name…"
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder:text-slate-500 flex-1 max-w-sm"
            />
            <button type="submit" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors">Search</button>
            {userSearch && (
              <button type="button" onClick={() => { setUserSearch(''); loadUsers(''); }}
                className="px-3 py-2 text-slate-400 hover:text-white text-sm">Clear</button>
            )}
          </form>

          {usersLoading ? (
            <div className="text-slate-500 text-sm py-8 text-center">Loading users…</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50">
                    {['Email', 'Name', 'Organisation', 'Plan', 'Status', 'Queries', 'Joined', 'Last Login', 'Signup IP', 'Last IP', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs text-slate-400 font-medium px-3 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 && (
                    <tr><td colSpan={11} className="text-center text-slate-500 py-10">No users found.</td></tr>
                  )}
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors">
                      <td className="px-3 py-3 text-slate-200 font-medium">{u.email}</td>
                      <td className="px-3 py-3 text-slate-400">{u.name ?? '—'}</td>
                      <td className="px-3 py-3 text-slate-400 max-w-[140px] truncate">{u.org_name ?? '—'}</td>
                      <td className="px-3 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          u.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-300' :
                          u.plan === 'pro' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-slate-700 text-slate-400'
                        }`}>{u.plan}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button onClick={() => handleViewUserQueries(u.id)}
                          className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                          {u.query_count}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-slate-500 text-xs whitespace-nowrap">{fmt(u.created_at)}</td>
                      <td className="px-3 py-3 text-slate-500 text-xs whitespace-nowrap">{fmt(u.last_login)}</td>
                      <td className="px-3 py-3 text-slate-500 font-mono text-xs">{u.signup_ip ?? '—'}</td>
                      <td className="px-3 py-3 text-slate-500 font-mono text-xs">{u.last_login_ip ?? '—'}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditUser(u)}
                            className="text-xs text-slate-400 hover:text-white border border-slate-700 px-2 py-1 rounded transition-colors">
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            disabled={deletingUserId === u.id}
                            className="text-xs text-red-500 hover:text-red-400 border border-red-900/50 px-2 py-1 rounded transition-colors disabled:opacity-50">
                            {deletingUserId === u.id ? '…' : 'Delete'}
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

      {/* ── QUERIES TAB ───────────────────────────────────── */}
      {tab === 'queries' && (
        <div>
          <div className="flex gap-2 mb-4 items-center">
            <input
              value={queryUserFilter}
              onChange={e => setQueryUserFilter(e.target.value)}
              placeholder="Filter by user ID (paste from users tab)…"
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder:text-slate-500 flex-1 max-w-sm font-mono"
            />
            <button onClick={() => loadQueries(queryUserFilter)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors">
              Filter
            </button>
            {queryUserFilter && (
              <button onClick={() => { setQueryUserFilter(''); loadQueries(''); }}
                className="px-3 py-2 text-slate-400 hover:text-white text-sm">Clear</button>
            )}
            <span className="text-slate-500 text-xs ml-auto">{queryTotal} total</span>
          </div>

          {queriesLoading ? (
            <div className="text-slate-500 text-sm py-8 text-center">Loading queries…</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50">
                    {['User', 'Query', 'Date', 'Latency', 'Cache', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs text-slate-400 font-medium px-3 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queries.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-slate-500 py-10">No queries found.</td></tr>
                  )}
                  {queries.map(q => (
                    <tr key={q.id} className="border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors">
                      <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">
                        <div>{q.user_email}</div>
                        {q.user_name && <div className="text-slate-600">{q.user_name}</div>}
                      </td>
                      <td className="px-3 py-3 text-slate-300 max-w-xs">
                        <span className="line-clamp-2">{q.query_text}</span>
                      </td>
                      <td className="px-3 py-3 text-slate-500 text-xs whitespace-nowrap">{fmt(q.created_at)}</td>
                      <td className="px-3 py-3 text-slate-500 text-xs">{q.latency_total_ms ?? '—'}ms</td>
                      <td className="px-3 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${q.cache_hit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                          {q.cache_hit ? 'hit' : 'miss'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => setViewQuery(q)}
                            className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900/50 px-2 py-1 rounded transition-colors">
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteQuery(q.id)}
                            disabled={deletingQueryId === q.id}
                            className="text-xs text-red-500 hover:text-red-400 border border-red-900/50 px-2 py-1 rounded transition-colors disabled:opacity-50">
                            {deletingQueryId === q.id ? '…' : 'Delete'}
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

      {/* ── HEALTH TAB ────────────────────────────────────── */}
      {tab === 'health' && (
        <div>
          {healthLoading && !health && (
            <div className="text-slate-500 text-sm py-8 text-center">Loading health data…</div>
          )}
          {health && (
            <div className="space-y-6">
              {/* Status row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Database', value: health.db, ok: health.db === 'healthy' },
                  { label: 'Redis Cache', value: health.redis, ok: health.redis === 'healthy' },
                  { label: 'CPU', value: health.cpu_percent != null ? `${health.cpu_percent}%` : 'N/A', ok: health.cpu_percent == null || health.cpu_percent < 80 },
                  { label: 'Memory', value: health.memory_percent != null ? `${health.memory_percent}% (${health.memory_used_gb}/${health.memory_total_gb} GB)` : 'N/A', ok: health.memory_percent == null || health.memory_percent < 85 },
                ].map(item => (
                  <div key={item.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                    <p className="text-sm font-medium text-white flex items-center">
                      <StatusDot ok={item.ok} />
                      <span className={item.ok ? 'text-emerald-400' : 'text-red-400'}>{item.value}</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* User stats */}
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

              {/* Query stats */}
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

              {/* Cache */}
              <div>
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Cache</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">Cache Hit Rate (24h)</p>
                    <p className="text-2xl font-bold text-white">{health.cache_hit_rate_pct}%</p>
                    <div className="mt-2 bg-slate-800 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${health.cache_hit_rate_pct}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600">Last updated: {new Date(health.timestamp).toLocaleString()}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
