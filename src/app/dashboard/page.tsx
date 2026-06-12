'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { useSSEStream } from '@/lib/useSSEStream';
import api from '@/lib/api';
import ProfileCompletionModal from '@/components/ProfileCompletionModal';
import ProfileDrawer from '@/components/ProfileDrawer';

// ─── Types ────────────────────────────────────────────────────────────────────

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

type ViewState = 'empty' | 'loading' | 'answer';

// ─── Answer Parsing ───────────────────────────────────────────────────────────

interface ParsedAnswer {
  stateTag: string;
  summary: string;
  legalBasis: string;
  citationsText: string;
  gaps: string;
  citationCount: number;
}

function parseAnswer(answer: string): ParsedAnswer {
  // Primary: split on --- separators (correct model output)
  let parts = answer.split(/\n---\n/);

  // Fallback: model omitted --- but used ### headings (wrong format, but recoverable)
  if (parts.length === 1) {
    const lbIdx  = answer.search(/\n###\s+(?:THE\s+)?LEGAL\s+BASIS/i);
    const citIdx = answer.search(/\n###\s+FULL\s+CITATIONS/i);
    const gapIdx = answer.search(/\n###\s+GAPS/i);

    if (lbIdx > -1) {
      parts = [answer.slice(0, lbIdx)];
      if (citIdx > -1) {
        parts.push(answer.slice(lbIdx, citIdx));
        if (gapIdx > -1) {
          parts.push(answer.slice(citIdx, gapIdx));
          parts.push(answer.slice(gapIdx));
        } else {
          parts.push(answer.slice(citIdx));
        }
      } else {
        parts.push(answer.slice(lbIdx));
      }
    }
  }

  const rawSummary = (parts[0] || '').trim();
  const stateTagMatch = rawSummary.match(/^\[(REQUIRED|PROHIBITED|NOT REQUIRED|CONDITIONAL)\]/);
  const stateTag = stateTagMatch ? stateTagMatch[1] : '';
  const summary = rawSummary
    .replace(/^\[(REQUIRED|PROHIBITED|NOT REQUIRED|CONDITIONAL)\]\s*/, '')
    .trim();

  let legalBasis = '';
  if (parts[1]) {
    legalBasis = parts[1]
      .replace(/^\s*###\s+(?:THE\s+)?LEGAL\s+BASIS\s*\n/i, '')
      .trim();
  }

  let citationsText = '';
  if (parts[2]) {
    citationsText = parts[2]
      .replace(/^\s*###\s+FULL\s+CITATIONS[^\n]*\n/i, '')
      .trim();
  }

  let gaps = '';
  if (parts[3]) {
    gaps = parts[3]
      .replace(/^\s*###\s+GAPS[^\n]*\n/i, '')
      .trim();
  }

  const citationCount = (citationsText.match(/\*\*📜/g) || []).length;

  return { stateTag, summary, legalBasis, citationsText, gaps, citationCount };
}

interface CitationBlock {
  title: string;
  quote: string;
  effectiveDate: string;
}

function parseCitationBlocks(citationsText: string): CitationBlock[] {
  const blocks: CitationBlock[] = [];
  // Split on blank lines before a citation block
  const rawBlocks = citationsText.split(/\n{2,}(?=\*\*📜)/);

  for (const block of rawBlocks) {
    if (!block.trim() || !block.includes('📜')) continue;

    const titleMatch = block.match(/\*\*📜\s+(.+?)\*\*/);
    const title = titleMatch ? titleMatch[1].trim() : '';
    if (!title) continue;

    const quoteLines = block.match(/^>\s+.+$/gm) || [];
    const quote = quoteLines.map(l => l.replace(/^>\s+/, '')).join(' ');

    const dateMatch = block.match(/\*\(Effective:\s+(.+?)\)\*/);
    const effectiveDate = dateMatch ? dateMatch[1].trim() : '';

    blocks.push({ title, quote, effectiveDate });
  }

  return blocks;
}

function extractTags(query: string): string[] {
  const q = query.toLowerCase();
  const tags: string[] = [];
  if (q.includes('epr') || q.includes('extended producer')) tags.push('EPR');
  if (q.includes('pwm') || q.includes('plastic waste')) tags.push('PWM');
  if (q.includes('e-waste') || q.includes('ewaste') || q.includes('electronic')) tags.push('E-Waste');
  if (q.includes('battery') || q.includes('batteries')) tags.push('Battery Waste');
  if (q.includes('hazardous') || q.includes('haz')) tags.push('Hazardous Waste');
  if (q.includes('single use') || q.includes('single-use')) tags.push('SUP');
  if (tags.length === 0) tags.push('PWM');
  return tags.slice(0, 2);
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffD = Math.floor(diffH / 24);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD === 1) return 'Yesterday';
  if (diffD < 7) return `${diffD} days ago`;
  return date.toLocaleDateString();
}

function getUserInitials(user: { name?: string | null; email?: string | null } | null): string {
  if (!user) return '?';
  const name = user.name || user.email || '';
  return name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || '?';
}

// ─── Simple Markdown Renderer ─────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function SimpleMarkdown({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactElement[] = [];
  let inList = false;
  let listItems: React.ReactElement[] = [];
  let key = 0;

  const flushList = () => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={key++} className="list-disc pl-5 mb-3 space-y-1">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  for (const line of lines) {
    const isBullet = /^\s*[\*\-]\s+/.test(line);
    if (isBullet) {
      inList = true;
      const content = line.replace(/^\s*[\*\-]\s+/, '');
      listItems.push(
        <li key={key++} className="text-sm leading-snug" style={{ color: '#002019' }}>
          {renderInline(content)}
        </li>
      );
    } else {
      flushList();
      if (line.trim()) {
        elements.push(
          <p key={key++} className="mb-3 text-sm leading-relaxed" style={{ color: '#002019' }}>
            {renderInline(line)}
          </p>
        );
      }
    }
  }
  flushList();

  return <div>{elements}</div>;
}

// ─── State Tag Badge ──────────────────────────────────────────────────────────

const STATE_TAG_STYLES: Record<string, { bg: string; text: string }> = {
  REQUIRED:     { bg: '#d4edda', text: '#155724' },
  PROHIBITED:   { bg: '#fde8e8', text: '#721c24' },
  'NOT REQUIRED': { bg: '#e2e3e5', text: '#383d41' },
  CONDITIONAL:  { bg: '#FAEEDA', text: '#856404' },
};

function StateTagBadge({ tag }: { tag: string }) {
  const style = STATE_TAG_STYLES[tag];
  if (!style) return null;
  return (
    <span
      className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        fontFamily: 'var(--font-dm-mono)',
      }}
    >
      {tag}
    </span>
  );
}

// ─── Loading State View ───────────────────────────────────────────────────────

type StepStatus = 'pending' | 'active' | 'done';

const STEP_LABELS = [
  'Query received',
  'Searching 340+ regulations...',
  'Retrieving citations',
  'Structuring answer',
];

function LoadingStateView({ query, onComplete }: { query: string; onComplete: () => void }) {
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([
    'active', 'pending', 'pending', 'pending',
  ]);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStepStatuses(['done', 'active', 'pending', 'pending']), 1200));
    timers.push(setTimeout(() => setStepStatuses(['done', 'done', 'active', 'pending']), 2400));
    timers.push(setTimeout(() => setStepStatuses(['done', 'done', 'done', 'active']), 3600));
    timers.push(setTimeout(() => setStepStatuses(['done', 'done', 'done', 'done']), 4800));
    timers.push(setTimeout(() => onCompleteRef.current(), 5600));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(230, 255, 245, 0.95)' }}
    >
      <div className="flex flex-col items-center gap-10 max-w-md w-full px-6">
        <h2
          className="text-2xl text-center italic leading-snug"
          style={{ fontFamily: 'var(--font-instrument-serif)', color: '#002019' }}
        >
          {query}
        </h2>
        <div className="w-full flex flex-col gap-6">
          {STEP_LABELS.map((label, i) => {
            const status = stepStatuses[i];
            return (
              <div
                key={i}
                className="flex items-center gap-4 transition-all duration-300"
                style={{ opacity: status === 'pending' ? 0.3 : 1 }}
              >
                {/* Step icon */}
                <div
                  className="relative w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: status === 'done' ? '#00694c' : status === 'active' ? '#008560' : '#6d7a73',
                    backgroundColor: status === 'done' ? '#00694c' : 'transparent',
                  }}
                >
                  {status === 'done' && (
                    <span
                      className="material-symbols-outlined text-white"
                      style={{ fontSize: '14px' }}
                    >
                      check
                    </span>
                  )}
                  {status === 'active' && (
                    <>
                      <div
                        className="absolute inset-0 rounded-full border-2 animate-ping"
                        style={{ borderColor: '#008560', opacity: 0.4 }}
                      />
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: '#008560' }}
                      />
                    </>
                  )}
                </div>
                {/* Step label */}
                <span
                  className="text-base"
                  style={{
                    fontFamily: 'var(--font-syne)',
                    fontWeight: status === 'active' ? 700 : 400,
                    color: status === 'active' ? '#008560' : '#002019',
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Answer Sections View ─────────────────────────────────────────────────────

function AnswerSectionsView({
  answer,
  query,
  warnings,
  onNewQuery,
}: {
  answer: string;
  query: string;
  warnings: string[];
  onNewQuery: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const parsed = parseAnswer(answer);
  const citationBlocks = parseCitationBlocks(parsed.citationsText);
  const tags = extractTags(query);

  return (
    <div className="px-12 pb-8 pt-6">
      {/* ── Section 1: Summary ─────────────────────────────── */}
      <section className="mb-12">
        {/* Query label */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[10px] tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-dm-mono)', color: '#008560' }}
          >
            Your Query
          </span>
        </div>

        {/* Query title + meta row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <h2
            className="text-3xl leading-tight max-w-3xl"
            style={{ fontFamily: 'var(--font-instrument-serif)', color: '#002019' }}
          >
            {query}
          </h2>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="flex gap-1">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-[10px] border"
                  style={{
                    backgroundColor: '#bbfbe6',
                    borderColor: '#bccac1',
                    color: '#3d4943',
                    fontFamily: 'var(--font-dm-mono)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
            {parsed.citationCount > 0 && (
              <div
                className="text-[10px]"
                style={{ fontFamily: 'var(--font-dm-mono)', color: '#6d7a73' }}
              >
                {parsed.citationCount} citation{parsed.citationCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Summary card */}
        <div
          className="p-6 rounded-xl border"
          style={{ backgroundColor: '#ffffff', borderColor: '#008560' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined" style={{ color: '#008560' }}>auto_awesome</span>
            <span
              className="text-[10px] uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-dm-mono)', color: '#008560' }}
            >
              Summary
            </span>
            {parsed.stateTag && <StateTagBadge tag={parsed.stateTag} />}
          </div>
          <p
            className="text-lg leading-relaxed font-medium"
            style={{ fontFamily: 'var(--font-syne)', color: '#002019' }}
          >
            {parsed.summary || answer}
          </p>
        </div>

        {/* Verification warnings */}
        {warnings.length > 0 && (
          <div
            className="mt-4 p-4 rounded-xl border flex gap-3"
            style={{ backgroundColor: '#FAEEDA', borderColor: '#EF9F27' }}
          >
            <span className="material-symbols-outlined" style={{ color: '#856404' }}>warning</span>
            <div>
              <p
                className="text-xs font-medium uppercase mb-1"
                style={{ fontFamily: 'var(--font-dm-mono)', color: '#856404' }}
              >
                Please Note
              </p>
              <p className="text-sm" style={{ color: '#7a5a00' }}>
                There may be exceptions or additional provisions relevant to this answer.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── Section 2: Legal Basis ─────────────────────────── */}
      {parsed.legalBasis && (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined" style={{ color: '#002019' }}>list_alt</span>
            <h3
              className="font-bold text-lg"
              style={{ fontFamily: 'var(--font-syne)', color: '#002019' }}
            >
              The Legal Basis
            </h3>
          </div>
          <div
            className="p-6 rounded-xl border"
            style={{ backgroundColor: '#ffffff', borderColor: '#bccac1' }}
          >
            <SimpleMarkdown text={parsed.legalBasis} />
          </div>
        </section>
      )}

      {/* ── Section 3: Full Citations ───────────────────────── */}
      {citationBlocks.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined" style={{ color: '#002019' }}>verified</span>
            <h3
              className="font-bold text-lg"
              style={{ fontFamily: 'var(--font-syne)', color: '#002019' }}
            >
              Full Citations ({parsed.citationCount})
            </h3>
          </div>
          <div className="flex flex-col gap-4">
            {citationBlocks.map((citation, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border transition-colors hover:border-[#008560]"
                style={{ backgroundColor: '#ffffff', borderColor: '#bccac1' }}
              >
                {/* Citation header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="material-symbols-outlined"
                      style={{ color: '#008560', fontSize: '18px' }}
                    >
                      verified
                    </span>
                    <span
                      className="text-sm"
                      style={{ fontFamily: 'var(--font-dm-mono)', color: '#008560' }}
                    >
                      {citation.title}
                    </span>
                  </div>
                  <span
                    className="text-[10px]"
                    style={{ fontFamily: 'var(--font-dm-mono)', color: '#6d7a73' }}
                  >
                    Source: MoEFCC
                  </span>
                </div>

                {/* Blockquote */}
                <div
                  className="pl-4 border-l-2 italic text-sm leading-relaxed mb-4"
                  style={{
                    borderColor: '#b5f5e0',
                    color: '#3d4943',
                  }}
                >
                  &ldquo;{citation.quote}&rdquo;
                </div>

                {/* Effective date */}
                {citation.effectiveDate && (
                  <div
                    className="text-[10px]"
                    style={{ fontFamily: 'var(--font-dm-mono)', color: '#6d7a73' }}
                  >
                    Effective: {citation.effectiveDate}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Section 4: Gaps & Limits + Actions ─────────────── */}
      <section className="flex flex-col gap-6">
        {parsed.gaps && (
          <div
            className="p-6 rounded-xl border flex gap-4"
            style={{ backgroundColor: '#ffffff', borderColor: '#bccac1' }}
          >
            <span className="material-symbols-outlined flex-shrink-0" style={{ color: '#008560' }}>info</span>
            <div className="flex flex-col gap-1">
              <span
                className="text-[10px] font-bold uppercase"
                style={{ fontFamily: 'var(--font-dm-mono)', color: '#008560' }}
              >
                Limitations &amp; Scope
              </span>
              <p className="text-sm leading-snug" style={{ color: '#002019' }}>
                {parsed.gaps}
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-4">
          <div className="relative">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(answer);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center gap-2 px-6 py-4 rounded-xl border transition-colors hover:bg-[#c9ffec]"
              style={{
                borderColor: copied ? '#008560' : '#bccac1',
                fontFamily: 'var(--font-syne)',
                fontSize: '14px',
                fontWeight: 700,
                color: copied ? '#008560' : '#002019',
                transition: 'all 0.2s',
              }}
            >
              <span className="material-symbols-outlined text-lg">
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? 'Copied!' : 'Copy Analysis'}
            </button>
            {copied && (
              <div
                className="absolute -top-9 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none"
                style={{
                  backgroundColor: '#002019',
                  color: '#ffffff',
                  fontFamily: 'var(--font-dm-mono)',
                  animation: 'fadeInUp 0.15s ease forwards',
                }}
              >
                Copied to clipboard
                <div
                  className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45"
                  style={{ backgroundColor: '#002019' }}
                />
              </div>
            )}
          </div>
          <button
            onClick={onNewQuery}
            className="flex items-center gap-2 px-6 py-4 rounded-xl ml-auto"
            style={{
              backgroundColor: '#008560',
              color: '#f5fff7',
              fontFamily: 'var(--font-syne)',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            <span className="material-symbols-outlined text-lg">add</span>
            New Query
          </button>
        </div>
      </section>
    </div>
  );
}

// ─── Suggested Queries ────────────────────────────────────────────────────────

const SUGGESTED_QUERIES = [
  { tag: 'PWM Rule 2022', text: 'How do I register as a Small Scale recycler?' },
  { tag: 'E-Waste', text: 'Timeline for solar panel recycling targets' },
  { tag: 'MoEFCC', text: 'Consent to Establish (CTE) validity periods' },
  { tag: 'Hazardous Waste', text: 'Manifest requirements for inter-state transit' },
];

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, isAdmin, logout } = useAuth();
  const router = useRouter();
  const {
    isStreaming, tokens, warnings, error,
    startStream, resetStream,
  } = useSSEStream();

  const [currentView, setCurrentView] = useState<ViewState>('empty');
  const [inputValue, setInputValue] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [animationComplete, setAnimationComplete] = useState(false);
  const [queryHistory, setQueryHistory] = useState<HistorySummary[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [historyAnswer, setHistoryAnswer] = useState<HistoryItem | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const answerScrollRef = useRef<HTMLDivElement>(null);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, isLoading, router]);

  // Transition from loading → answer when BOTH animation and streaming are done
  useEffect(() => {
    if (currentView !== 'loading') return;
    if (animationComplete && !isStreaming && (tokens || error)) {
      setCurrentView('answer');
    }
  }, [animationComplete, isStreaming, tokens, error, currentView]);

  // If an error occurs, show it in the answer view without waiting for animation
  useEffect(() => {
    if (currentView === 'loading' && error) {
      const t = setTimeout(() => setCurrentView('answer'), 500);
      return () => clearTimeout(t);
    }
  }, [error, currentView]);

  const loadHistory = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/query/history', { params: { page: 1, limit: 20 } });
      setQueryHistory(res.data?.queries || []);
    } catch {
      // silent – sidebar history is non-critical
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) loadHistory();
  }, [isAuthenticated, loadHistory]);

  const submitQuery = useCallback(
    (q: string) => {
      if (!q.trim() || isStreaming) return;
      setSubmittedQuery(q);
      setHistoryAnswer(null);
      setAnimationComplete(false);
      setCurrentView('loading');
      setInputValue('');
      resetStream();
      startStream(q).then(() => loadHistory());
    },
    [isStreaming, resetStream, startStream, loadHistory]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitQuery(inputValue);
  };

  const handleSuggestionClick = (text: string) => submitQuery(text);

  const handleHistoryClick = useCallback(
    async (historyId: string) => {
      if (isStreaming) return;
      setActiveHistoryId(historyId);
      try {
        const res = await api.get(`/query/history/${historyId}`);
        const item = res.data as HistoryItem;
        setHistoryAnswer(item);
        setSubmittedQuery(item.query_text);
        resetStream();
        setCurrentView('answer');
      } catch {
        // silent
      } finally {
        setActiveHistoryId(null);
      }
    },
    [isStreaming, resetStream]
  );

  const handleNewQuery = () => {
    resetStream();
    setHistoryAnswer(null);
    setSubmittedQuery('');
    setCurrentView('empty');
    setAnimationComplete(false);
    setInputValue('');
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#e6fff5' }}
      >
        <div className="text-center">
          <div
            className="text-3xl mb-2"
            style={{ fontFamily: 'var(--font-instrument-serif)', color: '#00694c' }}
          >
            Niyam<span style={{ color: '#008560' }}>AI</span>
          </div>
          <div
            className="text-sm"
            style={{ fontFamily: 'var(--font-syne)', color: '#6d7a73' }}
          >
            Loading your workspace...
          </div>
        </div>
      </div>
    );
  }

  const displayAnswer = historyAnswer ? historyAnswer.answer : tokens;
  const displayWarnings = historyAnswer ? [] : warnings;

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: '#e6fff5', color: '#002019' }}
    >
      <ProfileCompletionModal />
      <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* ══════════════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════════════ */}
      <aside
        className="fixed left-0 top-0 h-full w-[220px] flex flex-col border-r z-50"
        style={{ backgroundColor: '#e6fff5', borderColor: '#bccac1' }}
      >
        {/* ── Fixed top: brand + new query ── */}
        <div className="flex flex-col gap-4 px-4 pt-10 pb-3 flex-shrink-0">
          <h1
            className="text-[32px] font-normal leading-none px-1"
            style={{ fontFamily: 'var(--font-instrument-serif)', color: '#002019' }}
          >
            Niyam<span style={{ color: '#008560' }}>AI</span>
          </h1>
          <button
            onClick={handleNewQuery}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl active:scale-95 transition-all"
            style={{
              backgroundColor: '#008560',
              color: '#f5fff7',
              fontFamily: 'var(--font-syne)',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            <span className="material-symbols-outlined">add</span>
            New Query
          </button>
        </div>

        {/* ── Scrollable history ── */}
        <div className="flex flex-col flex-1 min-h-0 px-4 overflow-y-auto custom-scrollbar">
          <span
            className="text-[10px] uppercase tracking-wider px-1 pb-1 pt-2 flex-shrink-0 sticky top-0"
            style={{
              fontFamily: 'var(--font-dm-mono)',
              color: '#6d7a73',
              backgroundColor: '#e6fff5',
            }}
          >
            Recent Queries
          </span>

          {queryHistory.length === 0 && (
            <div
              className="px-3 py-2 text-[10px]"
              style={{ fontFamily: 'var(--font-dm-mono)', color: '#6d7a73' }}
            >
              No history yet
            </div>
          )}

          {queryHistory.map(item => {
            const isActive =
              currentView === 'answer' && submittedQuery === item.query_text;
            return (
              <div
                key={item.id}
                onClick={() => handleHistoryClick(item.id)}
                className="flex flex-col gap-1 p-3 cursor-pointer transition-colors flex-shrink-0"
                style={{
                  backgroundColor: isActive ? '#E1F5EE' : 'transparent',
                  borderRight: isActive ? '2px solid #008560' : '2px solid transparent',
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = '#b0efdb';
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '14px', color: isActive ? '#008560' : '#6d7a73' }}
                  >
                    chat_bubble
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ fontFamily: 'var(--font-dm-mono)', color: '#6d7a73' }}
                  >
                    {formatRelativeTime(item.created_at)}
                  </span>
                  {activeHistoryId === item.id && (
                    <span style={{ color: '#6d7a73', fontFamily: 'var(--font-dm-mono)', fontSize: '9px' }}>…</span>
                  )}
                </div>
                <p className="text-xs font-medium line-clamp-2 leading-tight" style={{ color: '#002019' }}>
                  {item.query_text}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Fixed bottom: profile ── */}
        <div
          className="flex flex-col gap-3 px-4 pt-4 pb-5 border-t flex-shrink-0"
          style={{ borderColor: '#bccac1' }}
        >
          {/* Clickable profile row → opens drawer */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-3 px-1 w-full text-left rounded-lg p-1 transition-colors"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = '#b0efdb')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: '#008560' }}
            >
              {getUserInitials(user)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm truncate" style={{ color: '#002019' }}>
                {user?.name || user?.email?.split('@')[0] || 'User'}
              </span>
              <span
                className="text-[10px] truncate"
                style={{ fontFamily: 'var(--font-dm-mono)', color: '#6d7a73' }}
              >
                {(user as any)?.designation || (user as any)?.org_type || 'Member'}
              </span>
            </div>
          </button>

          <div className="flex items-center justify-between px-1">
            {isAdmin && (
              <a
                href="/admin"
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-dm-mono)', color: '#008560' }}
              >
                Admin
              </a>
            )}
            <button
              onClick={handleLogout}
              className="p-1 transition-colors ml-auto"
              title="Sign out"
              style={{ color: '#3d4943' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#00694c')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#3d4943')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════
          MAIN PANEL
      ══════════════════════════════════════════════ */}
      <main
        className="ml-[220px] flex-1 flex flex-col h-full relative"
        style={{ backgroundColor: '#ffffff' }}
      >
        {/* ── Answer View (scrollable) ── */}
        <div
          ref={answerScrollRef}
          className={`flex-1 overflow-y-auto custom-scrollbar ${currentView === 'answer' ? 'block' : 'hidden'}`}
          style={{ paddingBottom: '160px' }}
        >
          {currentView === 'answer' && (displayAnswer || error) && (
            <>
              {error ? (
                <div className="px-12 pt-6">
                  <div
                    className="p-4 rounded-xl border text-sm"
                    style={{
                      backgroundColor: '#fff5f5',
                      borderColor: '#fca5a5',
                      color: '#991b1b',
                    }}
                  >
                    <p className="font-medium mb-1">Something went wrong</p>
                    <p>{error}</p>
                  </div>
                </div>
              ) : (
                <AnswerSectionsView
                  answer={displayAnswer!}
                  query={submittedQuery}
                  warnings={displayWarnings}
                  onNewQuery={handleNewQuery}
                />
              )}
            </>
          )}
        </div>

        {/* ── Empty State ── */}
        {currentView === 'empty' && (
          <div
            className="absolute inset-x-0 top-0 bottom-[88px] z-30 flex items-center justify-center animate-fade-in-up overflow-y-auto"
            style={{ backgroundColor: '#ffffff' }}
          >
            <div className="flex flex-col items-center gap-6 max-w-2xl w-full px-6 text-center py-6">
              {/* Icon */}
              <div
                className="w-20 h-20 rounded-xl flex items-center justify-center border"
                style={{ backgroundColor: '#bbfbe6', borderColor: '#008560' }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '40px', color: '#008560' }}
                >
                  gavel
                </span>
              </div>

              {/* Headline */}
              <div className="flex flex-col gap-4">
                <h2
                  className="text-5xl italic"
                  style={{ fontFamily: 'var(--font-instrument-serif)', color: '#002019' }}
                >
                  Ask Niyam anything
                </h2>
                <p
                  className="text-lg font-medium max-w-lg mx-auto"
                  style={{ fontFamily: 'var(--font-syne)', color: '#3d4943' }}
                >
                  Get deep, structured answers backed by citations from over 340+
                  Indian environmental and industrial regulations.
                </p>
              </div>

              {/* Suggestion cards */}
              <div className="grid grid-cols-2 gap-4 w-full mt-2">
                {SUGGESTED_QUERIES.map((sq, i) => (
                  <div
                    key={i}
                    onClick={() => handleSuggestionClick(sq.text)}
                    className="p-6 rounded-xl text-left cursor-pointer border transition-all group"
                    style={{ backgroundColor: '#ffffff', borderColor: '#bccac1' }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = '#008560';
                      el.style.backgroundColor = '#f5fff7';
                      el.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = '#bccac1';
                      el.style.backgroundColor = '#ffffff';
                      el.style.transform = 'translateY(0)';
                    }}
                  >
                    <span
                      className="px-3 py-1 rounded-full text-[10px] mb-4 inline-block"
                      style={{
                        backgroundColor: '#bbfbe6',
                        color: '#008560',
                        fontFamily: 'var(--font-dm-mono)',
                      }}
                    >
                      {sq.tag}
                    </span>
                    <p
                      className="font-bold text-sm"
                      style={{ color: '#002019', fontFamily: 'var(--font-syne)' }}
                    >
                      {sq.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Loading State ── */}
        {currentView === 'loading' && (
          <LoadingStateView
            query={submittedQuery}
            onComplete={() => setAnimationComplete(true)}
          />
        )}

        {/* ── Bottom Input Bar ── */}
        <div
          className="absolute bottom-0 left-0 w-full border-t z-50 p-6"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
            borderColor: '#bccac1',
          }}
        >
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
              <input
                className="w-full rounded-xl py-4 px-6 pr-16 text-base outline-none transition-all"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #bccac1',
                  color: '#002019',
                  fontFamily: 'var(--font-syne)',
                }}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Ask a compliance question about EPR, PWM, or E-Waste..."
                disabled={isStreaming}
                onFocus={e => ((e.target as HTMLInputElement).style.borderColor = '#008560')}
                onBlur={e => ((e.target as HTMLInputElement).style.borderColor = '#bccac1')}
              />
              <button
                type="submit"
                disabled={isStreaming || !inputValue.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: '#008560', color: '#f5fff7' }}
              >
                {isStreaming ? (
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#ffffff' }} />
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
