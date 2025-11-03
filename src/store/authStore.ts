import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, UserRole, LoginCredentials, SignupData, ForgotPasswordData, ResetPasswordData } from '../api/authApi';
import { loginApi, signupApi, checkAuthStatusApi, forgotPasswordApi, resetPasswordApi } from '../api/authApi';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  setRole: (role: UserRole) => void;
  clearError: () => void;
  checkAuthStatus: () => Promise<void>;
  forgotPassword: (data: ForgotPasswordData) => Promise<void>;
  resetPassword: (data: ResetPasswordData) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        try {
          set({ isLoading: true, error: null });
          
          const userData = await loginApi(credentials);
          
          const user: AuthUser = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            mobile: userData.mobile,
          };

          set({ 
            user, 
            token: userData.token,
            isAuthenticated: true, 
            isLoading: false,
            error: null
          });
        } catch (error) {
          set({ 
            user: null, 
            token: null,
            isAuthenticated: false, 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed'
          });
          throw error;
        }
      },

      signup: async (signupData) => {
        try {
          set({ isLoading: true, error: null });
          
          const userData = await signupApi(signupData);
          
          const user: AuthUser = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            mobile: userData.mobile,
          };

          set({ 
            user, 
            token: userData.token,
            isAuthenticated: true, 
            isLoading: false,
            error: null
          });
        } catch (error) {
          set({ 
            user: null, 
            token: null,
            isAuthenticated: false, 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Signup failed'
          });
          throw error;
        }
      },

      logout: () => {
        set({ 
          user: null, 
          token: null,
          isAuthenticated: false,
          error: null
        });
      },

      setRole: (role) => {
        const state = get();
        if (state.user) {
          set({ 
            user: { ...state.user, role }
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      checkAuthStatus: async () => {
        const state = get();
        if (!state.token) {
          return;
        }

        try {
          const userData = await checkAuthStatusApi();
          
          set({
            user: {
              id: userData._id || userData.id,
              name: userData.name,
              email: userData.email,
              role: userData.role,
              mobile: userData.mobile,
            },
            isAuthenticated: true,
          });
        } catch {
          // Token verification failed, logout
          get().logout();
        }
      },

      forgotPassword: async (data) => {
        try {
          set({ isLoading: true, error: null });
          
          await forgotPasswordApi(data);
          
          set({ 
            isLoading: false,
            error: null
          });
        } catch (error) {
          set({ 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to send password reset email'
          });
          throw error;
        }
      },

      resetPassword: async (data) => {
        try {
          set({ isLoading: true, error: null });
          
          const userData = await resetPasswordApi(data);
          
          const user: AuthUser = {
            id: userData.user.id,
            name: userData.user.name,
            email: userData.user.email,
            role: userData.user.role,
            mobile: userData.user.mobile,
          };

          set({ 
            user, 
            token: userData.token,
            isAuthenticated: true, 
            isLoading: false,
            error: null
          });
        } catch (error) {
          set({ 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to reset password'
          });
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);