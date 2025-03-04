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

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth functions
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/login/', credentials);
  
  // Store token in localStorage
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user_id', response.data.user_id.toString());
    localStorage.setItem('is_admin', response.data.is_admin.toString());
  }
  
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('is_admin');
};

export const getCurrentUser = async (): Promise<User> => {
  const isAdmin = localStorage.getItem('is_admin') === 'true';
  const endpoint = isAdmin ? '/admin-dashboard/' : '/user-dashboard/';
  
  const response = await api.get(endpoint);
  return response.data.user;
};

export const isAuthenticated = (): boolean => {
  return localStorage.getItem('token') !== null;
};

export const isAdmin = (): boolean => {
  return localStorage.getItem('is_admin') === 'true';
};

export default api;