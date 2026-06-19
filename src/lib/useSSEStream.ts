'use client';

import { useState, useCallback, useRef } from 'react';
import { refreshAccessToken } from './refreshToken';

export interface SSEEvent {
  type: 'start' | 'token' | 'citation' | 'verification_warning' | 'complete' | 'error';
  data: any;
}

export interface Citation {
  id: string;
  display_id: string;
  text: string;
  breadcrumb: string[];
}

export interface StreamState {
  isStreaming: boolean;
  tokens: string;
  citations: Citation[];
  warnings: string[];
  error: string | null;
  queryId: string | null;
  chatId: string | null;
  cached: boolean;
  latencyMs: number | null;
  totalTokens: number | null;
}

const initialState: StreamState = {
  isStreaming: false,
  tokens: '',
  citations: [],
  warnings: [],
  error: null,
  queryId: null,
  chatId: null,
  cached: false,
  latencyMs: null,
  totalTokens: null,
};

export function useSSEStream() {
  const [state, setState] = useState<StreamState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  const processEvent = useCallback((type: string, data: any) => {
    switch (type) {
      case 'start':
        setState(prev => ({
          ...prev,
          queryId: data.query_id,
          chatId: data.chat_id ?? prev.chatId,
          cached: data.cached || false,
        }));
        break;
      case 'token':
        setState(prev => ({ ...prev, tokens: prev.tokens + (data.text || '') }));
        break;
      case 'citation':
        setState(prev => ({ ...prev, citations: [...prev.citations, data as Citation] }));
        break;
      case 'verification_warning':
        setState(prev => ({ ...prev, warnings: [...prev.warnings, data.message] }));
        break;
      case 'complete':
        setState(prev => ({
          ...prev,
          isStreaming: false,
          latencyMs: data.latency_ms,
          totalTokens: data.total_tokens,
          cached: data.cached || false,
        }));
        break;
      case 'error':
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: data.message || 'We could not verify this answer. A compliance expert should be consulted.',
        }));
        break;
    }
  }, []);

  const startStream = useCallback(async (
    query: string,
    chatId: string | null = null,
    _isRetry = false,
  ): Promise<void> => {
    if (!_isRetry) {
      setState({ ...initialState, isStreaming: true, chatId });
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(`${apiUrl}/query/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, chat_id: chatId }),
        // SSE uses cookies exclusively — no Authorization header needed here.
        // The access_token cookie is always current because /auth/token/refresh
        // sets it as an httpOnly cookie that the browser sends automatically.
        credentials: 'include',
        signal: abortController.signal,
      });

      if (!response.ok) {
        if (response.status === 401 && !_isRetry) {
          // Use the shared singleton so this refresh doesn't race with the axios
          // interceptor or the proactive refresh timer in authContext.
          await refreshAccessToken();
          return startStream(query, chatId, true);
        }

        const errorText = await response.text().catch(() => '');
        let detail = `HTTP ${response.status}`;
        try { detail = JSON.parse(errorText).detail || detail; } catch {}
        throw new Error(detail);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream not available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            eventData = line.slice(6).trim();
            if (eventType && eventData) {
              try { processEvent(eventType, JSON.parse(eventData)); } catch {}
              eventType = '';
              eventData = '';
            }
          }
        }
      }

      setState(prev => ({ ...prev, isStreaming: false }));
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: error.message || 'Something went wrong. Please try again.',
      }));
    }
  }, [processEvent]);

  const stopStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  const resetStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(initialState);
  }, []);

  return { ...state, startStream, stopStream, resetStream };
}
