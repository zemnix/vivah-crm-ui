import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  User,
  CreateUserData,
  UpdateUserData,
  GetUsersParams,
  UsersResponse,
  UserRole,
  ForgotPasswordData,
  ResetPasswordData,
  createUserApi,
  getAllUsersApi,
  getUserByIdApi,
  updateUserApi,
  deleteUserApi,
  forgotPasswordApi,
  resetPasswordApi,
  DEFAULT_PAGINATION,
} from '../../api/userApi';

interface UserStore {
  // State
  users: User[];
  selectedUser: User | null;
  pagination: UsersResponse['pagination'] | null;
  loading: boolean;
  error: string | null;
  filters: GetUsersParams;

  // Basic setters
  setUsers: (users: User[]) => void;
  setSelectedUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<GetUsersParams>) => void;
  clearError: () => void;
  reset: () => void;

  // User CRUD operations
  createUser: (userData: CreateUserData) => Promise<User>;
  fetchAllUsers: (params?: GetUsersParams) => Promise<void>;
  fetchUserById: (userId: string) => Promise<User>;
  updateUser: (userId: string, userData: UpdateUserData) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  getAllStaff: () => Promise<void>;

  // Password management
  forgotPassword: (data: ForgotPasswordData) => Promise<void>;
  resetPassword: (data: ResetPasswordData) => Promise<void>;

  // Utility functions
  refreshUsers: () => Promise<void>;
  searchUsers: (searchTerm: string) => Promise<void>;
  filterByRole: (role: UserRole | undefined) => Promise<void>;
  changePage: (page: number) => Promise<void>;
  changeLimit: (limit: number) => Promise<void>;
}

const initialFilters: GetUsersParams = {
  page: DEFAULT_PAGINATION.page,
  limit: DEFAULT_PAGINATION.limit,
};

const initialState = {
  users: [],
  selectedUser: null,
  pagination: null,
  loading: false,
  error: null,
  filters: initialFilters,
};

export const useUserStore = create<UserStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Basic setters
      setUsers: (users) => set({ users }),
      setSelectedUser: (user) => set({ selectedUser: user }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilters: (newFilters) => 
        set({ filters: { ...get().filters, ...newFilters } }),
      clearError: () => set({ error: null }),
      reset: () => set(initialState),

      // Create user
      createUser: async (userData) => {
        try {
          set({ loading: true, error: null });
          
          const newUser = await createUserApi(userData);
          
          // Add to current users list
          const currentUsers = get().users;
          set({ 
            users: [newUser, ...currentUsers],
            loading: false 
          });
          
          return newUser;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      // Fetch all users with pagination and filters
      fetchAllUsers: async (params) => {
        try {
          set({ loading: true, error: null });
          
          const queryParams = params || get().filters;
          const response = await getAllUsersApi(queryParams);
          
          set({ 
            users: response.users,
            pagination: response.pagination,
            filters: queryParams,
            loading: false 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      // Fetch user by ID
      fetchUserById: async (userId) => {
        try {
          set({ loading: true, error: null });
          
          const user = await getUserByIdApi(userId);
          
          set({ 
            selectedUser: user,
            loading: false 
          });
          
          return user;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      // Update user
      updateUser: async (userId, userData) => {
        try {
          set({ loading: true, error: null });
          
          const updatedUser = await updateUserApi(userId, userData);
          
          // Update in users list
          const users = get().users;
          const updatedUsers = users.map(user => 
            user._id === userId ? updatedUser : user
          );
          
          set({ 
            users: updatedUsers,
            selectedUser: get().selectedUser?._id === userId ? updatedUser : get().selectedUser,
            loading: false 
          });
          
          return updatedUser;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      // Delete user
      deleteUser: async (userId) => {
        try {
          set({ loading: true, error: null });
          
          await deleteUserApi(userId);
          
          // Remove from users list
          const users = get().users;
          const filteredUsers = users.filter(user => user._id !== userId);
          
          set({ 
            users: filteredUsers,
            selectedUser: get().selectedUser?._id === userId ? null : get().selectedUser,
            loading: false 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      // Forgot password
      forgotPassword: async (data) => {
        try {
          set({ loading: true, error: null });
          
          await forgotPasswordApi(data);
          
          set({ loading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send password reset email';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      // Reset password
      resetPassword: async (data) => {
        try {
          set({ loading: true, error: null });
          
          await resetPasswordApi(data);
          
          set({ loading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      // Refresh users with current filters
      refreshUsers: async () => {
        const filters = get().filters;
        await get().fetchAllUsers(filters);
      },

      // Search users
      searchUsers: async (searchTerm) => {
        const newFilters = { 
          ...get().filters, 
          search: searchTerm,
          page: 1 // Reset to first page when searching
        };
        await get().fetchAllUsers(newFilters);
      },

      // get all staff
      getAllStaff: async () => {
        const newFilters = { 
          role: 'staff' as UserRole,
          page: 1 // Reset to first page when filtering
        };
        await get().fetchAllUsers(newFilters);
      },

      // Filter by role
      filterByRole: async (role) => {
        const newFilters = { 
          ...get().filters, 
          role,
          page: 1 // Reset to first page when filtering
        };
        await get().fetchAllUsers(newFilters);
      },

      // Change page
      changePage: async (page) => {
        const newFilters = { ...get().filters, page };
        await get().fetchAllUsers(newFilters);
      },

      // Change limit
      changeLimit: async (limit) => {
        const newFilters = { 
          ...get().filters, 
          limit,
          page: 1 // Reset to first page when changing limit
        };
        await get().fetchAllUsers(newFilters);
      },
    }),
    {
      name: 'admin-user-store',
    }
  )
);