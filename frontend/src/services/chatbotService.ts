import api from './api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProcessingStep {
  stage: string;
  status: 'running' | 'completed' | 'failed' | 'error' | 'skipped';
  message: string;
  details?: Record<string, any>;
  error?: string;
}

export interface ChatResponse {
  reply: string;
  sources: Array<{ ID?: string; TEXT_CHUNK?: string; SCORE?: number; METADATA?: string }>;
  session_id: string;
  graph_image?: string;
  chart_type?: string;
  insights?: string;
  intent?: string;
  processing?: ProcessingStep[];
  records_matched?: number;
  type?: string;
  status?: string;
  data?: Record<string, any>;
  query_plan?: Record<string, any>;
}

export interface ChatSession {
  SESSION_ID: string;
  SUBJECT: string;
  CREATED_AT: string;
  UPDATED_AT: string;
}

export interface ChatMessageRecord {
  MESSAGE_ID: string;
  SESSION_ID: string;
  ROLE: 'user' | 'assistant';
  CONTENT: string;
  SOURCES?: Array<{ ID?: string; TEXT_CHUNK?: string; SCORE?: number; METADATA?: string }> | null;
  INTENT?: string | null;
  METADATA?: Record<string, any> | null;
  TIMESTAMP: string;
}

export interface GenerateGraphRequest {
  prompt: string;
  chart_type?: string;
  dataset_id?: string;
  session_id?: string;
}

export interface GenerateGraphResponse {
  graph_image?: string;
  chart_type?: string;
  insights?: string;
  title?: string;
  metrics?: Record<string, any>;
  data?: Record<string, any>;
}

// ── Session API Functions ────────────────────────────────────────────────────

export const fetchChatSessions = async (signal?: AbortSignal): Promise<ChatSession[]> => {
  const res = await api.get<ChatSession[]>('/chat/sessions', { signal });
  return res.data;
};

export const fetchSessionMessages = async (sessionId: string, signal?: AbortSignal): Promise<ChatMessageRecord[]> => {
  const res = await api.get<ChatMessageRecord[]>(`/chat/sessions/${encodeURIComponent(sessionId)}`, { signal });
  return res.data;
};

export const deleteChatSession = async (sessionId: string): Promise<void> => {
  await api.delete(`/chat/sessions/${sessionId}`);
};

// ── Graph Generation API ─────────────────────────────────────────────────────

export const generateGraph = async (data: GenerateGraphRequest): Promise<GenerateGraphResponse> => {
  const res = await api.post<GenerateGraphResponse>('/graph/generate', data);
  if (res.data && res.data.graph_image && !res.data.graph_image.startsWith('data:')) {
    res.data.graph_image = `data:image/png;base64,${res.data.graph_image}`;
  }
  return res.data;
};

// ── Standard Chat Function ───────────────────────────────────────────────────

export const sendChatMessage = async (
  message: string,
  sessionId: string = 'default'
): Promise<ChatResponse> => {
  const res = await api.post<ChatResponse>('/chat', { message, session_id: sessionId });
  if (res.data && res.data.graph_image && !res.data.graph_image.startsWith('data:')) {
    res.data.graph_image = `data:image/png;base64,${res.data.graph_image}`;
  }
  return res.data;
};

// ── SSE Streaming Chat Function (Token & Stage Streaming) ───────────────────

export const sendChatMessageStream = async (
  message: string,
  sessionId: string = 'default',
  onStep: (step: ProcessingStep) => void,
  onToken: (token: string) => void,
  onResult: (res: ChatResponse) => void,
  onError: (err: any) => void
) => {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const userJson = localStorage.getItem('auth_user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        if (user?.user_id) {
          headers['X-User-Id'] = user.user_id;
        }
      } catch {
        // ignore
      }
    }

    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify({ message, session_id: sessionId }),
    });

    if (!response.ok || !response.body) {
      // Fallback to standard HTTP POST /api/chat
      const standardRes = await sendChatMessage(message, sessionId);
      onResult(standardRes);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.substring(6));

            switch (parsed.type) {
              case 'request_started':
                break;

              case 'stage': {
                const step: ProcessingStep = {
                  stage: parsed.stage,
                  status: parsed.status,
                  message: parsed.message,
                  details: parsed.details,
                  error: parsed.error,
                };
                onStep(step);
                break;
              }

              case 'processing':
                if (parsed.step) {
                  onStep(parsed.step);
                }
                break;

              case 'token':
                if (parsed.content) {
                  onToken(parsed.content);
                } else if (parsed.token) {
                  onToken(parsed.token);
                } else if (parsed.text) {
                  onToken(parsed.text);
                }
                break;

              case 'final_answer':
                if (parsed.content && !buffer.length) {
                  // If final answer is provided as a complete text
                }
                break;

              case 'result':
                if (parsed.data) {
                  const resData = parsed.data as ChatResponse;
                  if (resData.graph_image && !resData.graph_image.startsWith('data:')) {
                    resData.graph_image = `data:image/png;base64,${resData.graph_image}`;
                  }
                  onResult(resData);
                }
                break;

              case 'request_completed':
                break;

              default:
                break;
            }
          } catch {
            // Ignore partial SSE lines
          }
        }
      }
    }
  } catch (err) {
    onError(err);
  }
};
