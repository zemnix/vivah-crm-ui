import axios from 'axios';

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://vinayak-enterprises-crm-backend-6702538897.asia-southeast1.run.app/api/v1';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_AUTH_API_BASE_URL || 'http://localhost:4000/api/v1';

// Create axios instance with interceptor for auth
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('auth-storage');
  const token = authStorage ? JSON.parse(authStorage).state.token : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.log('No token found, not setting Authorization header');
  }
  return config;
});

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'API request failed');
    }
    throw error;
  }
);

export default apiClient;