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
  const userJson = localStorage.getItem('auth_user');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      if (user?.user_id) {
        config.headers['X-User-Id'] = user.user_id;
      }
    } catch {
      // ignore
    }
  }
  return config;
});

export default api;
