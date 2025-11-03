import { useCallback } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { DashboardFilters } from '@/api/dashboardApi';

export const useDashboard = () => {
  const {
    staffData,
    adminData,
    isLoadingStaff,
    isLoadingAdmin,
    staffError,
    adminError,
    fetchStaffDashboard,
    fetchAdminDashboard,
    clearStaffData,
    clearAdminData,
    clearAllData,
    clearErrors,
  } = useDashboardStore();

  // Wrapper functions with error handling
  const fetchStaffData = useCallback(async (filters?: DashboardFilters) => {
    try {
      await fetchStaffDashboard(filters);
    } catch (error) {
      console.error('Failed to fetch staff dashboard:', error);
    }
  }, [fetchStaffDashboard]);

  const fetchAdminData = useCallback(async (filters?: DashboardFilters) => {
    try {
      await fetchAdminDashboard(filters);
    } catch (error) {
      console.error('Failed to fetch admin dashboard:', error);
    }
  }, [fetchAdminDashboard]);

  // Get current user's dashboard data based on role
  const getCurrentUserDashboard = useCallback((userRole: string) => {
    switch (userRole) {
      case 'staff':
        return {
          data: staffData,
          isLoading: isLoadingStaff,
          error: staffError,
          fetchData: fetchStaffData,
          clearData: clearStaffData,
        };
      case 'admin':
        return {
          data: adminData,
          isLoading: isLoadingAdmin,
          error: adminError,
          fetchData: fetchAdminData,
          clearData: clearAdminData,
        };
      default:
        return {
          data: null,
          isLoading: false,
          error: 'Invalid user role',
          fetchData: () => Promise.resolve(),
          clearData: () => {},
        };
    }
  }, [
    staffData,
    adminData,
    isLoadingStaff,
    isLoadingAdmin,
    staffError,
    adminError,
    fetchStaffData,
    fetchAdminData,
    clearStaffData,
    clearAdminData,
  ]);

  return {
    // Individual dashboard data
    staffData,
    adminData,
    
    // Loading states
    isLoadingStaff,
    isLoadingAdmin,
    
    // Error states
    staffError,
    adminError,
    
    // Fetch functions
    fetchStaffData,
    fetchAdminData,
    
    // Clear functions
    clearStaffData,
    clearAdminData,
    clearAllData,
    clearErrors,
    
    // Utility function
    getCurrentUserDashboard,
  };
};
