import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // This allows cookies to be sent with requests
});

export const githubClient = axios.create({ baseURL: 'https://api.github.com' });

export const internalClient = axios.create({ baseURL: 'https://my-api.com' });

// Auth token management with cookies
const TOKEN_NAME = 'auth_token';
const COOKIE_OPTIONS = {
  expires: 7, // 7 days
  secure: import.meta.env.PROD, // Use secure in production
  sameSite: 'strict' as const,
  path: '/'
};

const getAuthToken = (): string | undefined => {
  return Cookies.get(TOKEN_NAME);
};

const setAuthToken = (token: string): void => {
  Cookies.set(TOKEN_NAME, token, COOKIE_OPTIONS);
};

const removeAuthToken = (): void => {
  Cookies.remove(TOKEN_NAME, { path: '/' });
};

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    if (error.config && error.response?.status === 401) {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        
        // Here you would implement token refresh logic if needed
        // For example:
        // try {
        //   const refreshToken = Cookies.get('refresh_token');
        //   const response = await axios.post(
        //     `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
        //     { refreshToken }
        //   );
        //   const { token } = response.data;
        //   setAuthToken(token);
        //   originalRequest.headers.Authorization = `Bearer ${token}`;
        //   return apiClient(originalRequest);
        // } catch (refreshError) {
        //   // If refresh fails, log out the user
        //   removeAuthToken();
        //   window.location.href = '/login';
        //   return Promise.reject(refreshError);
        // }
        
        // For now, we'll just log out the user on 401
        removeAuthToken();
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Authentication functions
export const login = async (email: string, password: string) => {
  const response = await apiClient.post('/auth/login', { email, password });
  const { token } = response.data;
  setAuthToken(token);
  return response.data;
};

export const logout = () => {
  removeAuthToken();
  window.location.href = '/login';
};

export default apiClient;
