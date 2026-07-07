import axios, { AxiosInstance } from 'axios';

export const API = import.meta.env.VITE_API_BASE_URL;
const baseURL = API ?? '/api';

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
  if (token && config.headers) {
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
