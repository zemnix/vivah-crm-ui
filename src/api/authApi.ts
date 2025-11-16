import apiClient from './apiClient';

export type UserRole = 'admin' | 'staff';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  mobile?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  mobile?: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
}

export const loginApi = async (credentials: LoginCredentials) => {
  try {
    const response = await apiClient.post('/users/login', credentials);
    return response.data.data;
  } catch (error: any) {
    // Try multiple paths to extract error message from different response structures
    const errorMessage = 
      error.response?.data?.message || 
      error.response?.data?.error?.message ||
      error.message || 
      'Invalid email or password';
    throw new Error(errorMessage);
  }
};

export const signupApi = async (signupData: SignupData) => {
  try {
    const response = await apiClient.post('/users/signup', signupData);
    return response.data.data;
  } catch (error: any) {
    // Try multiple paths to extract error message from different response structures
    const errorMessage = 
      error.response?.data?.message || 
      error.response?.data?.error?.message ||
      error.message || 
      'Signup failed';
    throw new Error(errorMessage);
  }
};

export const checkAuthStatusApi = async () => {
  try {
    const response = await apiClient.get('/users/profile');
    return response.data.data;
  } catch {
    throw new Error('Invalid token');
  }
};

export const forgotPasswordApi = async (data: ForgotPasswordData) => {
  try {
    const response = await apiClient.post('/users/forgot-password', data);
    return response.data.data;
  } catch (error: any) {
    // Try multiple paths to extract error message from different response structures
    const errorMessage = 
      error.response?.data?.message || 
      error.response?.data?.error?.message ||
      error.message || 
      'Failed to send password reset email';
    throw new Error(errorMessage);
  }
};

export const resetPasswordApi = async (data: ResetPasswordData) => {
  try {
    const response = await apiClient.post('/users/reset-password', data);
    return response.data.data;
  } catch (error: any) {
    // Try multiple paths to extract error message from different response structures
    const errorMessage = 
      error.response?.data?.message || 
      error.response?.data?.error?.message ||
      error.message || 
      'Failed to reset password';
    throw new Error(errorMessage);
  }
};