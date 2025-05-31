import axios from 'axios';

// Types
export interface User {
  id_user: number;
  email: string;
  name: string;
  phone: string;
  is_admin: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user_id: number;
  email: string;
  is_admin: boolean;
  redirect_url: string;
}

// Create API instance
const API_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Get auth token from either localStorage or sessionStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth functions
export const login = async (credentials: LoginRequest, rememberMe: boolean): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/login/', credentials);
  
  // Store token in localStorage or sessionStorage based on rememberMe
  if (response.data.token) {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('token', response.data.token);
    storage.setItem('user_id', response.data.user_id.toString());
    storage.setItem('is_admin', response.data.is_admin.toString());
  }
  
  return response.data;
};

export const logout = () => {
  // Clear from both storage types to ensure complete logout
  localStorage.removeItem('token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('is_admin');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user_id');
  sessionStorage.removeItem('is_admin');
};

export const getCurrentUser = async (): Promise<User> => {
  const isAdmin = localStorage.getItem('is_admin') === 'true' || 
                  sessionStorage.getItem('is_admin') === 'true';
  const endpoint = isAdmin ? '/admin-dashboard/' : '/user-dashboard/';
  
  const response = await api.get(endpoint);
  return response.data.user;
};

export const isAuthenticated = (): boolean => {
  return getAuthToken() !== null;
};

export const isAdmin = (): boolean => {
  return localStorage.getItem('is_admin') === 'true' || 
         sessionStorage.getItem('is_admin') === 'true';
};

// Language functions
export const setLanguage = async (language: string): Promise<void> => {
  try {
    await api.post('/set-language/', { language });
  } catch (error) {
    console.error('Failed to update backend language:', error);
  }
};

// Get current language from localStorage
export const getCurrentLanguage = (): string => {
  return localStorage.getItem('i18nextLng') || 'en';
};

export default api;