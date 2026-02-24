import axios from 'axios';

// const DEV_DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1';
// const PROD_DEFAULT_API_BASE_URL =
//   'https://vivah-EVENTS-crm-backend-6702538897.asia-southeast1.run.app/api/v1';

// // In dev, prefer local backend. Some environments inject VITE_API_BASE_URL globally (often pointing to prod),
// // which breaks new local-only endpoints during development. If you truly want to hit a remote API in dev,
// // set VITE_USE_REMOTE_API=true.
// const envBaseUrl: string | undefined = import.meta.env.VITE_API_BASE_URL;
// const useRemoteInDev = String(import.meta.env.VITE_USE_REMOTE_API || '').toLowerCase() === 'true';

// const DEFAULT_API_BASE_URL = import.meta.env.DEV ? DEV_DEFAULT_API_BASE_URL : PROD_DEFAULT_API_BASE_URL;

// const API_BASE_URL =
//   import.meta.env.DEV && !useRemoteInDev
//     ? DEV_DEFAULT_API_BASE_URL
//     : (envBaseUrl || DEFAULT_API_BASE_URL);

const API_BASE_URL='https://swagat-events-crm-backend-6702538897.asia-southeast1.run.app/api/v1';

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