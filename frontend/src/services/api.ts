import axios, { AxiosInstance } from 'axios';

const baseURL =
  import.meta.env.VITE_API_URL || 'http://localhost:4001';

const clearAuthStorage = () => {
  localStorage.removeItem('storeflow_token');
  localStorage.removeItem('storeflow_user_name');
  localStorage.removeItem('storeflow_user_email');
  localStorage.removeItem('storeflow_store_name');
};

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('storeflow_token');

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAuthStorage();
    }

    return Promise.reject(error);
  }
);