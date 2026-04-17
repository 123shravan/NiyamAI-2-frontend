'use client';

import { useState, useCallback, useRef } from 'react';
import { useAuth } from './authContext';
import api from './api';

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
  cached: false,
  latencyMs: null,
  totalTokens: null,
};

/**
 * Custom React hook for handling SSE query streams.
 * Gets access token from auth context
 */
export function useSSEStream() {
  const { accessToken } = useAuth();
  const [state, setState] = useState<StreamState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Event handler logic - moved outside startStream to avoid closure issues
  const processEvent = useCallback((type: string, data: any) => {
    switch (type) {
      case 'start':
        setState(prev => ({
          ...prev,
          queryId: data.query_id,
          cached: data.cached || false,
        }));
        break;

      case 'token':
        setState(prev => ({
          ...prev,
          tokens: prev.tokens + (data.text || ''),
        }));
        break;

      case 'citation':
        setState(prev => ({
          ...prev,
          citations: [...prev.citations, data as Citation],
        }));
        break;

      case 'verification_warning':
        setState(prev => ({
          ...prev,
          warnings: [...prev.warnings, data.message],
        }));
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

  const startStream = useCallback(async (query: string) => {
    // Reset state
    setState({ ...initialState, isStreaming: true });

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Build headers - DO NOT include Authorization header
      // We rely on httpOnly cookies which are automatically sent with credentials:'include'
      // This avoids token staleness issues in the React context
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      console.log('[useSSEStream] Query:', query);
      console.log('[useSSEStream] Using cookie-based auth (credentials: include)');

      const fetchUrl = `${apiUrl}/query/stream`;
      console.log('[useSSEStream] Fetching from:', fetchUrl);
      
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
        credentials: 'include', // Send httpOnly cookies - handles auth transparently
        signal: abortController.signal,
      });
      
      console.log('[useSSEStream] Fetch succeeded, response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorData: any = {};
        
        console.error('[useSSEStream] Response not OK:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 200),
        });
        
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Response might be error text, not JSON
        }

        // Handle 401 - refresh and retry once
        if (response.status === 401) {
          try {
            console.log('[useSSEStream] Received 401, attempting to refresh token...');
            const refreshRes = await api.post('/auth/token/refresh');
            console.log('[useSSEStream] Token refreshed successfully, retrying stream...');
            // Retry the stream with the new cookie-based auth
            return startStream(query);
          } catch (refreshErr) {
            console.error('[useSSEStream] Token refresh failed:', refreshErr);
            throw new Error('Session expired. Please log in again.');
          }
        }

        throw new Error(errorData.detail || `HTTP ${response.status}: ${errorText || 'Failed to stream query'}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream not available');

      console.log('[useSSEStream] Stream response received, reading events...');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[useSSEStream] Stream reading completed');
          break;
        }

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
              try {
                const parsed = JSON.parse(eventData);
                processEvent(eventType, parsed);
              } catch (e) {
                // Ignore parse errors
              }
              eventType = '';
              eventData = '';
            }
          }
        }
      }

      setState(prev => ({ ...prev, isStreaming: false }));
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[useSSEStream] Stream aborted by user');
        return;
      }
      console.error('[useSSEStream] Error during streaming:', {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 200),
      });
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: error.message || 'Something went wrong. Please try again.',
      }));
    }
  }, [processEvent, accessToken]);

  const stopStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  const resetStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(initialState);
  }, []);

  return {
    ...state,
    startStream,
    stopStream,
    resetStream,
  };
}
