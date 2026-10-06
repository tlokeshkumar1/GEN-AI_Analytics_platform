import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use((response) => {
  if (typeof response.data === 'string' &&
      (String(response.headers['content-type']).includes('text/html') || /^\s*<(?:!doctype|html)/i.test(response.data))) {
    const message = 'SAP returned a sign-in page instead of API data. Sign in again; if this repeats, check the application router API destination.';
    throw new axios.AxiosError(message, 'ERR_SAP_SESSION', response.config, response.request,
      { ...response, status: 401, data: { detail: message } });
  }
  return response;
});

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (status === 401) return 'Your SAP session has expired or is invalid. Sign out and sign in again.';
    if (status === 403) return 'Your SAP account does not have permission for this operation. Check its project role collections.';
    if (status === 404) return 'The requested API or chat session was not found. Check the backend and application router destination.';
    if (status === 502 || status === 503 || status === 504) return 'The backend or SAP service is unavailable. Check the backend connection and retry.';
    if (!error.response) return 'The API could not be reached. Check your connection and that the backend is running.';
  }
  return error instanceof Error ? error.message : fallback;
}

export default api;
