'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import api from '@/lib/api';
import ProfileCompletionModal from '@/components/ProfileCompletionModal';
import UserProfileAvatar from '@/components/UserProfileAvatar';
import { Citation, useSSEStream } from '@/lib/useSSEStream';

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

interface RenderedCitation {
  title: string;
  source: string;
  text: string;
  meta: string;
}

const loadingSteps = [
  'Query received',
  'Searching 340+ regulations...',
  'Retrieving citations',
  'Structuring answer',
];

const suggestedQueries = [
  'How do I register as a Small Scale recycler?',
  'Timeline for solar panel recycling targets',
  'Consent to Establish (CTE) validity periods',
  'Manifest requirements for inter-state transit',
];

const defaultProvisionCards = [
  {
    title: 'Centralized Registration Requirement',
    description: 'All processors should maintain their registrations and statutory permissions in one auditable flow.',
  },
  {
    title: 'Real-time Data Reconciliation',
    description: 'Matched returns and citations reduce duplication and improve the traceability of compliance records.',
  },
  {
    title: 'Penalty for Non-Reporting',
    description: 'Late submissions and missing supporting data should surface clearly before the answer is finalized.',
  },
];

function formatRelativeTime(dateValue: string) {
  const diffMs = Date.now() - new Date(dateValue).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) {
    return 'Yesterday';
  }

  return `${diffDays}d ago`;
}

function buildScopeTags(queryText: string) {
  const lower = queryText.toLowerCase();
  const tags = ['PWM', 'EPR', 'E-Waste'].filter((tag) => lower.includes(tag.toLowerCase()));
  return tags.length > 0 ? tags : ['PWM', 'EPR'];
}

function buildCitations(
  selectedHistory: HistoryItem | null,
  streamedCitations: Citation[]
): RenderedCitation[] {
  if (selectedHistory) {
    return selectedHistory.cited_node_ids.map((citationId) => ({
      title: citationId.replace(/_/g, ' '),
      source: 'Saved query citation',
      text: 'This answer was retrieved from query history, which preserves the citation node references used in the response.',
      meta: citationId,
    }));
  }

  return streamedCitations.map((citation) => ({
    title: citation.display_id || citation.id,
    source: citation.breadcrumb?.length ? citation.breadcrumb.join(' / ') : 'Live citation',
    text: citation.text,
    meta: citation.id,
  }));
}

function formatLatency(latencyMs: number | null | undefined) {
  if (latencyMs === null || latencyMs === undefined) return null;
  return `${(latencyMs / 1000).toFixed(1)}s`;
}

export default function RegulatoryCabinDashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const {
    isStreaming,
    tokens,
    citations,
    warnings,
    error,
    cached,
    latencyMs,
    startStream,
    resetStream,
  } = useSSEStream();

  const [query, setQuery] = useState('');
  const [queryHistory, setQueryHistory] = useState<HistorySummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [loadingQuery, setLoadingQuery] = useState('What are the specific EPR fulfillment timelines for plastic waste processors?');
  const [copied, setCopied] = useState(false);
  const [activeScope, setActiveScope] = useState<'PWM' | 'EPR' | 'E-Waste'>('PWM');

  const answerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (answerRef.current) {
      answerRef.current.scrollTop = answerRef.current.scrollHeight;
    }
  }, [tokens, selectedHistory, citations, isStreaming]);

  useEffect(() => {
    if (!isStreaming) {
      setLoadingPhase(0);
      return;
    }

    const timers = [
      window.setTimeout(() => setLoadingPhase(1), 0),
      window.setTimeout(() => setLoadingPhase(2), 1200),
      window.setTimeout(() => setLoadingPhase(3), 2400),
      window.setTimeout(() => setLoadingPhase(4), 3600),
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [isStreaming]);

  const loadHistory = useCallback(async () => {
    if (!isAuthenticated) return;

    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const res = await api.get('/query/history', {
        params: { page: 1, limit: 20 },
      });
      setQueryHistory(res.data?.queries || []);
    } catch {
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

  const openHistoryItem = useCallback(async (historyId: string) => {
    if (isStreaming) return;

    setActiveHistoryId(historyId);
    setHistoryError(null);

    try {
      const res = await api.get(`/query/history/${historyId}`);
      const item = res.data as HistoryItem;
      setSelectedHistory(item);
      setQuery(item.query_text);
      setCopied(false);
      resetStream();
      inputRef.current?.focus();
    } catch {
      setHistoryError('Could not open this history item. Please try again.');
    } finally {
      setActiveHistoryId(null);
    }
  }, [isStreaming, resetStream]);

  const displayedAnswer = selectedHistory ? selectedHistory.answer : tokens;
  const displayedQuery = selectedHistory?.query_text || loadingQuery || query || 'Ask Niyam anything';
  const scopeTags = buildScopeTags(selectedHistory?.query_text || query);
  const citationCards = buildCitations(selectedHistory, citations);
  const citationCount = selectedHistory?.cited_node_ids.length ?? citations.length;
  const summaryText = displayedAnswer.trim()
    ? displayedAnswer
    : 'Ask a compliance question about EPR, PWM, or E-Waste to get a structured answer backed by citations from Indian environmental regulations.';
  const latencyLabel = formatLatency(selectedHistory?.latency_total_ms ?? latencyMs);
  const latestQueryLabel = selectedHistory
    ? new Date(selectedHistory.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : isStreaming
      ? 'Updated live'
      : 'Ready for query';
  const displayedHistoryItems = queryHistory.slice(0, 3);
  const provisionCards = citationCards.length > 0
    ? citationCards.slice(0, 3).map((citation, index) => ({
        title: citation.source,
        description: citation.text,
        badge: `${String(index + 1).padStart(2, '0')}`,
      }))
    : defaultProvisionCards.map((card, index) => ({
        title: card.title,
        description: card.description,
        badge: `${String(index + 1).padStart(2, '0')}`,
      }));
  const showAnswerPanel = Boolean(displayedAnswer.trim()) || Boolean(selectedHistory) || isStreaming || Boolean(error);

  const submitQuery = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;

    setSelectedHistory(null);
    setHistoryError(null);
    setCopied(false);
    setLoadingQuery(trimmed);
    await startStream(trimmed);
    await loadHistory();
  }, [isStreaming, loadHistory, startStream]);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    await submitQuery(query);
  }, [query, submitQuery]);

  const handleCopyAnalysis = useCallback(async () => {
    if (!displayedAnswer.trim() || typeof navigator === 'undefined' || !navigator.clipboard) return;

    await navigator.clipboard.writeText(displayedAnswer);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }, [displayedAnswer]);

  const handleDownloadPdf = useCallback(() => {
    window.print();
  }, []);

  const handleNewQuery = useCallback(() => {
    setSelectedHistory(null);
    setQuery('');
    setHistoryError(null);
    setCopied(false);
    setLoadingQuery('Ask Niyam anything about PWM, EPR, or E-Waste.');
    resetStream();
    inputRef.current?.focus();
  }, [resetStream]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/login');
  }, [logout, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-dim text-on-surface flex items-center justify-center">
        <div className="text-center animate-fade-in-up">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-outline-variant bg-surface-container-high">
            <span className="material-symbols-outlined text-primary-container">gavel</span>
          </div>
          <div className="font-headline text-2xl text-on-surface">Niyam AI</div>
          <div className="mt-2 text-sm text-on-surface-variant">Loading your cabin...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-surface-dim text-on-surface">
      <ProfileCompletionModal />

      <aside className="border-b border-outline-variant bg-surface/95 backdrop-blur-md lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:w-[220px] lg:flex-col lg:justify-between lg:border-b-0 lg:border-r">
        <div className="flex flex-col gap-5 px-4 py-4 lg:px-3 lg:py-5">
          <div className="flex items-center justify-between px-1 lg:justify-start lg:gap-2">
            <h1 className="font-headline text-2xl font-normal leading-none text-on-surface">
              Niyam<span className="text-primary-container">AI</span>
            </h1>

            <button
              type="button"
              onClick={handleNewQuery}
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant px-3 py-2 text-xs font-semibold text-on-surface-variant lg:hidden"
            >
              <span className="material-symbols-outlined text-base">add</span>
              New Query
            </button>
          </div>

          <button
            type="button"
            onClick={handleNewQuery}
            className="hidden items-center justify-center gap-2 rounded-xl bg-primary-container px-4 py-3 text-button text-on-primary-container transition-transform duration-150 active:scale-95 lg:flex"
          >
            <span className="material-symbols-outlined">add</span>
            New Query
          </button>

          <nav className="flex flex-col gap-2 lg:mt-2">
            <span className="px-1 text-[11px] font-medium uppercase tracking-[0.28em] text-outline">
              Recent Queries
            </span>

            <div className="custom-scrollbar flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {historyLoading && displayedHistoryItems.length === 0 ? (
                <div className="min-w-[180px] rounded-xl border border-outline-variant bg-surface-container-low px-3 py-4 text-sm text-on-surface-variant lg:min-w-0">
                  Loading history...
                </div>
              ) : displayedHistoryItems.length === 0 ? (
                <div className="min-w-[180px] rounded-xl border border-outline-variant bg-surface-container-low px-3 py-4 text-sm text-on-surface-variant lg:min-w-0">
                  No saved queries yet.
                </div>
              ) : (
                displayedHistoryItems.map((item) => {
                  const isActive = selectedHistory?.id === item.id;
                  const isLoadingItem = activeHistoryId === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openHistoryItem(item.id)}
                      className={`min-w-[240px] rounded-xl border p-4 text-left transition-all duration-200 lg:min-w-0 ${isActive
                        ? 'border-primary-container bg-niyam-active-bg shadow-sm'
                        : 'border-transparent bg-transparent hover:border-outline-variant hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined ${isActive ? 'text-primary-container' : 'text-outline'}`}>
                          chat_bubble
                        </span>
                        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-outline">
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-snug text-on-surface">
                        {item.query_text}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-outline">
                        {item.cache_hit && <span>Cached</span>}
                        {item.latency_total_ms !== null && <span>{formatLatency(item.latency_total_ms)}</span>}
                        {isLoadingItem && <span>Loading...</span>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </nav>
        </div>

        <div className="border-t border-outline-variant px-4 py-4 lg:py-5">
          <div className="flex items-center gap-3 px-1">
            <UserProfileAvatar />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-on-surface">
                {user?.name || user?.email || 'Arjun Mehta'}
              </span>
              <span className="truncate text-[11px] font-medium uppercase tracking-[0.2em] text-outline">
                {user?.designation || user?.plan || 'Senior Counsel'}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between px-1">
            {user?.is_admin ? (
              <Link href="/admin" className="p-2 text-on-surface-variant transition-colors hover:text-primary-container" title="Admin Portal">
                <span className="material-symbols-outlined">shield</span>
              </Link>
            ) : (
              <span />
            )}
            <button type="button" className="p-2 text-on-surface-variant transition-colors hover:text-primary-container" title="Settings">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <button type="button" className="p-2 text-on-surface-variant transition-colors hover:text-primary-container" title="Help">
              <span className="material-symbols-outlined">help_outline</span>
            </button>
            <button type="button" onClick={handleLogout} className="p-2 text-on-surface-variant transition-colors hover:text-primary-container" title="Logout">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="relative min-h-screen lg:ml-[220px]">
        <div className="flex h-full flex-col">
          <div ref={answerRef} id="answer-view" className="custom-scrollbar flex-1 overflow-y-auto px-5 pb-[190px] pt-6 sm:px-8 lg:px-10 lg:pt-8">
            <section className="mb-10 animate-fade-in-up">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-primary-container">Your Query</span>
              </div>

              <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <h2 className="max-w-4xl font-headline text-[2rem] leading-[1.12] tracking-[-0.02em] text-on-surface sm:text-[2.5rem] lg:text-[3rem]">
                  {displayedQuery}
                </h2>

                <div className="flex flex-col items-start gap-2 xl:items-end">
                  <div className="flex flex-wrap gap-2">
                    {scopeTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-outline-variant bg-surface-container-high px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-on-surface-variant"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3 text-[11px] font-medium uppercase tracking-[0.2em] text-outline">
                    <span>{citationCount} citations</span>
                    <span>{latestQueryLabel}</span>
                    {selectedHistory?.cache_hit || cached ? <span>Cached</span> : null}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-primary-container bg-surface-container-lowest p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container">auto_awesome</span>
                  <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-primary-container">Summary</span>
                </div>
                <p className="max-w-4xl text-lg leading-relaxed text-on-surface sm:text-xl">
                  {error ? `Could not complete this query: ${error}` : summaryText}
                </p>

                {warnings.length > 0 && (
                  <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800">
                    <p className="mb-1 font-semibold">Please note</p>
                    <p>There may be exceptions or additional provisions relevant to this answer.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="mb-10 animate-fade-in-up" style={{ animationDelay: '0.08s' }}>
              <div className="mb-5 flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface">list_alt</span>
                <h3 className="text-lg font-semibold text-on-surface">Key Legal Provisions</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {provisionCards.map((card) => (
                  <div key={`${card.title}-${card.badge}`} className="group flex gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-colors hover:border-primary-container hover:bg-surface-container-low">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-container text-sm font-bold text-white">
                      {card.badge}
                    </div>
                    <div className="flex flex-col gap-1">
                      <h4 className="text-[13px] font-semibold text-on-surface">{card.title}</h4>
                      <p className="text-sm leading-snug text-on-surface-variant">{card.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-10 animate-fade-in-up" style={{ animationDelay: '0.16s' }}>
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface">verified</span>
                  <h3 className="text-lg font-semibold text-on-surface">Full Citations ({citationCards.length})</h3>
                </div>
                {latencyLabel && (
                  <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-outline">
                    {latencyLabel}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-4">
                {citationCards.length === 0 ? (
                  <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 text-sm text-on-surface-variant">
                    Run a query to populate the citation list.
                  </div>
                ) : (
                  citationCards.map((citation) => (
                    <div key={citation.meta} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 transition-colors hover:border-primary-container">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="material-symbols-outlined text-lg text-primary-container">verified</span>
                          <span className="text-sm font-medium text-primary-container">{citation.title}</span>
                        </div>
                        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-outline">{citation.source}</span>
                      </div>
                      <div className="border-l-2 border-surface-container-high pl-4 text-sm leading-relaxed text-on-surface-variant italic">
                        {citation.text}
                      </div>
                      <div className="mt-3 text-[11px] font-medium uppercase tracking-[0.2em] text-outline">
                        Ref: {citation.meta}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="flex flex-col gap-4 animate-fade-in-up" style={{ animationDelay: '0.24s' }}>
              <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
                <div className="flex gap-3">
                  <span className="material-symbols-outlined text-primary-container">info</span>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary-container">Limitations &amp; Scope</span>
                    <p className="text-sm leading-snug text-on-surface">
                      This analysis is based on the current query context and available citations. Cross-check with the latest notifications or state-level circulars before taking compliance action.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                <button
                  type="button"
                  onClick={handleCopyAnalysis}
                  disabled={!displayedAnswer.trim()}
                  className="inline-flex items-center gap-2 rounded-xl border border-outline-variant px-4 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">content_copy</span>
                  {copied ? 'Copied' : 'Copy Analysis'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-2 rounded-xl border border-outline-variant px-4 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={handleNewQuery}
                  className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary-container px-4 py-3 text-sm font-semibold text-on-primary-container transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  New Query
                </button>
              </div>
            </section>
          </div>

          {!showAnswerPanel && !isStreaming && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-surface-container-lowest px-5">
              <div className="fade-in-up flex max-w-2xl flex-col items-center gap-8 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-primary-container bg-surface-container-high">
                  <span className="material-symbols-outlined text-4xl text-primary-container">gavel</span>
                </div>
                <div className="flex flex-col gap-4">
                  <h2 className="font-headline text-[2rem] italic text-on-surface sm:text-[3rem]">Ask Niyam anything</h2>
                  <p className="max-w-xl text-lg leading-relaxed text-on-surface-variant">
                    Get deep, structured answers backed by citations from Indian environmental and industrial regulations.
                  </p>
                </div>

                <div className="grid w-full gap-4 sm:grid-cols-2">
                  {suggestedQueries.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => submitQuery(item)}
                      className="suggestion-card group rounded-xl border border-outline-variant bg-surface-container-lowest p-5 text-left transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <span className="mb-3 inline-block rounded-full bg-surface-container-high px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-primary-container">
                        Suggested
                      </span>
                      <p className="text-sm font-semibold text-on-surface transition-colors group-hover:text-primary-container">
                        {item}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isStreaming && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-surface/95 px-5 backdrop-blur-sm">
              <div className="flex w-full max-w-md flex-col items-center gap-8">
                <h2 className="font-headline text-[1.75rem] leading-tight text-center italic text-on-surface sm:text-[2.25rem]">
                  {loadingQuery}
                </h2>

                <div className="w-full space-y-4">
                  {loadingSteps.map((step, index) => {
                    const current = index + 1;
                    const isDone = loadingPhase > current;
                    const isActive = loadingPhase === current;

                    return (
                      <div key={step} className={`loading-step flex items-center gap-3 ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}>
                        <div className={`step-icon relative flex h-8 w-8 items-center justify-center rounded-full border-2 ${isDone ? 'border-primary-container bg-primary-container text-white' : isActive ? 'border-primary-container bg-transparent text-primary-container' : 'border-outline'}`}>
                          {isDone ? (
                            <span className="material-symbols-outlined text-sm">check</span>
                          ) : isActive ? (
                            <>
                              <span className="pulse-ring absolute inset-0 rounded-full border-2 border-primary-container" />
                              <span className="dot h-2 w-2 rounded-full bg-primary-container" />
                            </>
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-outline" />
                          )}
                        </div>
                        <span className={`step-text text-base ${isActive ? 'font-semibold text-primary-container' : 'text-on-surface'}`}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="absolute bottom-0 left-0 z-50 w-full border-t border-outline-variant bg-white/80 p-4 backdrop-blur-md lg:left-[220px] lg:w-[calc(100%-220px)] lg:p-5">
            <div className="mx-auto flex max-w-4xl flex-col gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.28em] text-outline">Scope:</span>
                {(['PWM', 'EPR', 'E-Waste'] as const).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveScope(tag)}
                    className={`whitespace-nowrap rounded-full border px-4 py-1 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors ${activeScope === tag
                      ? 'border-primary bg-surface-container-high text-primary'
                      : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="relative">
                <input
                  ref={inputRef}
                  id="main-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ask a compliance question about EPR, PWM, or E-Waste..."
                  type="text"
                  disabled={isStreaming}
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-5 py-4 pr-16 text-on-surface placeholder:text-outline/70 focus:border-primary-container focus:ring-0"
                />
                <button
                  type="submit"
                  disabled={isStreaming || !query.trim()}
                  className="btn-pulse absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-primary-container text-on-primary-container transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="material-symbols-outlined">send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {historyError && (
        <div className="fixed bottom-24 right-4 z-[60] max-w-sm rounded-xl border border-error-container bg-error-container px-4 py-3 text-sm text-on-error-container shadow-lg">
          {historyError}
        </div>
      )}
    </div>
  );
}
