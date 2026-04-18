'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { useSSEStream } from '@/lib/useSSEStream';
import api from '@/lib/api';
import UserProfileAvatar from '@/components/UserProfileAvatar';
import ProfileCompletionModal from '@/components/ProfileCompletionModal';

interface HistorySummary {
  id: string;
  query_text: string;
  answer_preview: string;
  created_at: string;
  cache_hit: boolean;
  latency_total_ms: number | null;
}

interface HistoryItem {
  id: string;
  query_text: string;
  answer: string;
  cited_node_ids: string[];
  cache_hit: boolean;
  verification_passed: boolean;
  latency_total_ms: number | null;
  created_at: string;
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, isAdmin, logout } = useAuth();
  const router = useRouter();
  const {
    isStreaming, tokens, warnings, error,
    cached, latencyMs, startStream, stopStream, resetStream,
  } = useSSEStream();

  const [query, setQuery] = useState('');
  const [queryHistory, setQueryHistory] = useState<HistorySummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Auto-scroll answer pane
  useEffect(() => {
    if (answerRef.current) {
      answerRef.current.scrollTop = answerRef.current.scrollHeight;
    }
  }, [tokens, selectedHistory]);

  const loadHistory = useCallback(async () => {
    if (!isAuthenticated) return;

    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const res = await api.get('/query/history', {
        params: { page: 1, limit: 20 },
      });
      const items: HistorySummary[] = res.data?.queries || [];
      setQueryHistory(items);
    } catch (err) {
      setHistoryError('Could not load your search history. Please try again.');
    } finally {
      setHistoryLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadHistory();
    }
  }, [isAuthenticated, loadHistory]);

  const handleHistoryClick = useCallback(async (historyId: string) => {
    if (isStreaming) return;

    setActiveHistoryId(historyId);
    setHistoryError(null);

    try {
      const res = await api.get(`/query/history/${historyId}`);
      const item = res.data as HistoryItem;
      setSelectedHistory(item);
      setQuery(item.query_text);
      resetStream();
    } catch (err) {
      setHistoryError('Could not open this history item. Please try again.');
    } finally {
      setActiveHistoryId(null);
    }
  }, [isStreaming, resetStream]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isStreaming) return;

    setSelectedHistory(null);
    await startStream(query);
    await loadHistory();
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Suggested questions for new users
  const suggestedQueries = [
    "What are EPR obligations for producers?",
    "What is the minimum thickness for carry bags?",
    "What are the penalties for non-compliance?",
    "Do plastic bag manufacturers need registration?",
    "Which single-use plastics are banned?",
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center animate-pulse-soft">
          <div className="text-2xl font-bold text-slate-800 mb-2">Niyam AI</div>
          <div className="text-slate-500 text-sm">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  const displayedAnswer = selectedHistory ? selectedHistory.answer : tokens;

  return (
    <div className="min-h-screen bg-slate-50">
      <ProfileCompletionModal />
      
      {/* ── Header ────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Niyam AI</h1>
              <p className="text-xs text-slate-400 hidden sm:block">Plastic Waste Management Rules</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <a 
                href="/admin" 
                className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
              >
                Admin Portal
              </a>
            )}
            <UserProfileAvatar />
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Query Input */}
        <div className="mb-8 animate-fade-in-up">
          <form onSubmit={handleSubmit} className="relative">
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200 p-2 flex gap-2">
              <input
                id="query-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a compliance question about Plastic Waste Management Rules..."
                className="flex-1 px-4 py-3 text-slate-800 placeholder:text-slate-400 bg-transparent outline-none text-base"
                disabled={isStreaming}
                autoFocus
              />
              <button
                type="submit"
                disabled={isStreaming || !query.trim()}
                className="btn-primary px-6 py-3 flex items-center gap-2 whitespace-nowrap"
              >
                {isStreaming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Ask
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Streaming status */}
          {isStreaming && (
            <div className="mt-3 flex items-center gap-2 text-sm text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              Searching the regulations for your answer...
            </div>
          )}
        </div>

        {/* Suggested queries — show when no answer */}
        {!displayedAnswer && !isStreaming && !error && !selectedHistory && (
          <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <p className="text-sm font-medium text-slate-500 mb-3">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQueries.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setQuery(q); }}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Answer Section */}
        {(displayedAnswer || isStreaming || error) && (
          <div className="animate-fade-in-up">
            {/* Answer card */}
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200 overflow-hidden">
              {/* Answer header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-slate-700">Answer</span>
                  {selectedHistory && (
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                      History
                    </span>
                  )}
                  {cached && (
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                      Cached
                    </span>
                  )}
                </div>
                {(selectedHistory?.latency_total_ms ?? latencyMs) !== null && (
                  <span className="text-xs text-slate-400">
                    {(((selectedHistory?.latency_total_ms ?? latencyMs) || 0) / 1000).toFixed(1)}s
                  </span>
                )}
              </div>

              {/* Answer body */}
              <div ref={answerRef} className="px-6 py-5 max-h-[60vh] overflow-y-auto">
                {error ? (
                  <div className="text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="font-medium mb-1">Something went wrong</p>
                    <p className="text-sm">{error}</p>
                  </div>
                ) : (
                  <div className="prose prose-slate prose-sm max-w-none">
                    <div className={`whitespace-pre-wrap leading-7 text-slate-700 ${isStreaming ? 'cursor-blink' : ''}`}>
                      {displayedAnswer}
                    </div>
                  </div>
                )}

                {/* Verification warnings */}
                {warnings.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm font-medium text-amber-800 mb-1">
                      ⚠️ Please note:
                    </p>
                    {warnings.map((w, i) => (
                      <p key={i} className="text-sm text-amber-700">
                        There may be exceptions or additional provisions relevant to this answer.
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              {!isStreaming && displayedAnswer && (
                <div className="border-t border-slate-100 px-6 py-3 flex justify-between items-center">
                  {selectedHistory ? (
                    <p className="text-xs text-slate-400">
                      {new Date(selectedHistory.created_at).toLocaleString()}
                    </p>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={() => { setSelectedHistory(null); resetStream(); setQuery(''); }}
                    className="text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors"
                  >
                    Ask another question →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Query History */}
        <div className="mt-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-500">Your search history</p>
            <button
              onClick={loadHistory}
              className="text-xs text-slate-500 hover:text-blue-600 font-medium"
              disabled={historyLoading}
            >
              {historyLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {historyError && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              {historyError}
            </div>
          )}

          {queryHistory.length === 0 ? (
            <div className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-4">
              No history yet. Ask your first compliance question to start tracking.
            </div>
          ) : (
            <div className="space-y-2">
              {queryHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleHistoryClick(item.id)}
                  className="w-full text-left px-4 py-3 bg-white border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-700 font-medium truncate">{item.query_text}</p>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.answer_preview}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                    {item.cache_hit && <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700">cached</span>}
                    {item.latency_total_ms !== null && (
                      <span>{(item.latency_total_ms / 1000).toFixed(1)}s</span>
                    )}
                    {activeHistoryId === item.id && <span>loading...</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-400">
        Niyam AI v3.0 · Answers are based on Plastic Waste Management Rules 2016 and amendments.
        <br />
        Always verify with a qualified compliance advisor.
      </footer>
    </div>
  );
}
