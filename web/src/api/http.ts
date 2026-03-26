import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshingPromise: Promise<string | null> | null = null;

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as RetryConfig | undefined;

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshingPromise) {
        refreshingPromise = http
          .post('/auth/refresh', {})
          .then((res) => {
            const accessToken = (res.data as { data?: { accessToken?: string } })?.data?.accessToken;
            if (accessToken) {
              localStorage.setItem('accessToken', accessToken);
              return accessToken;
            }
            return null;
          })
          .catch(() => null)
          .finally(() => {
            refreshingPromise = null;
          });
      }

      const newToken = await refreshingPromise;
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return http(originalRequest);
      }
    }

    return Promise.reject(error);
  },
);
