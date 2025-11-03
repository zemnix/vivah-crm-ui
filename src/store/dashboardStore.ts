import { create } from 'zustand';
import { dashboardApi, DashboardFilters, StaffDashboardData, AdminDashboardData } from '@/api/dashboardApi';

interface DashboardState {
  staffData: StaffDashboardData | null;
  adminData: AdminDashboardData | null;
  isLoadingStaff: boolean;
  isLoadingAdmin: boolean;
  staffError: string | null;
  adminError: string | null;
  fetchStaffDashboard: (filters?: DashboardFilters) => Promise<void>;
  fetchAdminDashboard: (filters?: DashboardFilters) => Promise<void>;
  clearStaffData: () => void;
  clearAdminData: () => void;
  clearAllData: () => void;
  clearErrors: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  staffData: null,
  adminData: null,
  isLoadingStaff: false,
  isLoadingAdmin: false,
  staffError: null,
  adminError: null,

  fetchStaffDashboard: async (filters?: DashboardFilters) => {
    set({ isLoadingStaff: true, staffError: null });
    
    try {
      const data = await dashboardApi.getStaffDashboard(filters);
      set({ 
        staffData: data, 
        isLoadingStaff: false,
        staffError: null 
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch staff dashboard data';
      set({ 
        staffError: errorMessage, 
        isLoadingStaff: false 
      });
      throw error;
    }
  },
  
  fetchAdminDashboard: async (filters?: DashboardFilters) => {
    set({ isLoadingAdmin: true, adminError: null });
    
    try {
      const data = await dashboardApi.getAdminDashboard(filters);
      set({ 
        adminData: data, 
        isLoadingAdmin: false,
        adminError: null 
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch admin dashboard data';
      set({ 
        adminError: errorMessage, 
        isLoadingAdmin: false 
      });
      throw error;
    }
  },
  
  // Clear data methods
  clearStaffData: () => set({ staffData: null, staffError: null }),
  
  clearAdminData: () => set({ adminData: null, adminError: null }),
  clearAllData: () => set({ 
    staffData: null, 
    adminData: null,
    staffError: null,
    adminError: null
  }),
  
  // Clear all errors
  clearErrors: () => set({ 
    staffError: null, 
    adminError: null 
  }),
}));
