import api from './api';

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
}

export const sendChatMessage = async (message: string, sessionId: string = 'default'): Promise<ChatResponse> => {
  const res = await api.post<ChatResponse>('/chat', { message, session_id: sessionId });
  if (res.data && res.data.graph_image && !res.data.graph_image.startsWith('data:')) {
    res.data.graph_image = `data:image/png;base64,${res.data.graph_image}`;
  }
  return res.data;
};

export const sendChatMessageStream = async (
  message: string,
  sessionId: string = 'default',
  onStep: (step: ProcessingStep) => void,
  onResult: (res: ChatResponse) => void,
  onError: (err: any) => void
) => {
  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, session_id: sessionId }),
    });

    if (!response.ok || !response.body) {
      // Fallback to standard chat endpoint if stream is unavailable
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
                console.log('[PIPELINE] request started');
                break;

              case 'stage': {
                // Real-time stage event from the backend pipeline
                const step: ProcessingStep = {
                  stage: parsed.stage,
                  status: parsed.status,
                  message: parsed.message,
                  details: parsed.details,
                  error: parsed.error,
                };
                console.log(`[PIPELINE] received stage event: ${step.stage}/${step.status}`);
                onStep(step);
                break;
              }

              case 'processing':
                // Legacy format backward compatibility
                if (parsed.step) {
                  console.log(`[PIPELINE] received legacy step: ${parsed.step.stage}/${parsed.step.status}`);
                  onStep(parsed.step);
                }
                break;

              case 'final_answer':
                console.log('[PIPELINE] final answer received');
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
                console.log('[PIPELINE] request completed');
                break;

              default:
                console.warn('[PIPELINE] unknown event type:', parsed.type);
            }
          } catch (e) {
            console.error('Error parsing SSE event', e);
          }
        }
      }
    }
  } catch (err) {
    onError(err);
  }
};
