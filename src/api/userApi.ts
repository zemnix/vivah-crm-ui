import apiClient from './apiClient';

export type UserRole = 'admin' | 'staff' | 'technician';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  mobile?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  mobile?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  mobile?: string;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  role?: UserRole;
  search?: string;
}

export interface UsersResponse {
  users: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
}

// Helper function to handle API errors
const handleApiError = (error: any, defaultMessage: string): never => {
  throw new Error(error?.response?.data?.message || defaultMessage);
};

// User CRUD operations (Admin only)
export const createUserApi = async (userData: CreateUserData): Promise<User> => {
  try {
    const response = await apiClient.post('/users/create-user', userData);
    return response.data.data;
  } catch (error) {
    return handleApiError(error, 'Failed to create user');
  }
};

export const getAllUsersApi = async (params: GetUsersParams = {}): Promise<UsersResponse> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.role) queryParams.append('role', params.role);
    if (params.search) queryParams.append('search', params.search);

    const queryString = queryParams.toString();
    const url = queryString ? `/users/get-all?${queryString}` : '/users/get-all';
    
    const response = await apiClient.get(url);
    return response.data.data;
  } catch (error) {
    return handleApiError(error, 'Failed to fetch users');
  }
};

export const getUserByIdApi = async (userId: string): Promise<User> => {
  try {
    const response = await apiClient.get(`/users/get-by-id/${userId}`);
    return response.data.data;
  } catch (error) {
    return handleApiError(error, 'Failed to fetch user');
  }
};

export const updateUserApi = async (userId: string, userData: UpdateUserData): Promise<User> => {
  try {
    const response = await apiClient.put(`/users/update-user/${userId}`, userData);
    return response.data.data;
  } catch (error) {
    return handleApiError(error, 'Failed to update user');
  }
};

export const deleteUserApi = async (userId: string): Promise<{ id: string }> => {
  try {
    const response = await apiClient.delete(`/users/delete-user/${userId}`);
    return response.data.data;
  } catch (error) {
    return handleApiError(error, 'Failed to delete user');
  }
};

// Password reset operations
export const forgotPasswordApi = async (data: ForgotPasswordData) => {
  try {
    const response = await apiClient.post('/users/forgot-password', data);
    return response.data.data;
  } catch (error) {
    return handleApiError(error, 'Failed to send password reset email');
  }
};

export const resetPasswordApi = async (data: ResetPasswordData) => {
  try {
    const response = await apiClient.post('/users/reset-password', data);
    return response.data.data;
  } catch (error) {
    return handleApiError(error, 'Failed to reset password');
  }
};

// Utility functions for filtering and searching
export const filterUsersByRole = (users: User[], role?: UserRole): User[] => {
  if (!role) return users;
  return users.filter(user => user.role === role);
};

export const searchUsers = (users: User[], searchTerm: string): User[] => {
  if (!searchTerm) return users;
  
  const term = searchTerm.toLowerCase();
  return users.filter(user => 
    user.name.toLowerCase().includes(term) ||
    user.email.toLowerCase().includes(term) ||
    (user.mobile && user.mobile.includes(term))
  );
};

// Helper function to build query parameters
export const buildUserQueryParams = (params: GetUsersParams): string => {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value.toString());
    }
  });
  
  return queryParams.toString();
};

// Constants for user management
export const USER_ROLES: UserRole[] = ['admin', 'staff', 'technician'];

export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 10
};

export const PAGINATION_LIMITS = [5, 10, 20, 50, 100];