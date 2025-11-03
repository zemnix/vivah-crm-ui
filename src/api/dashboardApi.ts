import apiClient from './apiClient';

export interface DashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
}

export interface MonthlyData {
  date: string;
  created: number;
  resolved: number;
}

export interface DashboardData {
  stats: DashboardStats;
  monthlyData: MonthlyData[];
}

// Staff Dashboard Types
export interface InteractionStats {
  total: number;
  scheduled: number;
  completed: number;
  missed: number;
}

export interface InteractionMonthlyData {
  date: string;
  scheduled: number;
  completed: number;
  missed: number;
}

export interface StaffDashboardData {
  interactions: {
    stats: InteractionStats;
    monthlyData: InteractionMonthlyData[];
  };
}

// Admin Dashboard Types
export interface AdminDashboardData {
  interactions: {
    stats: InteractionStats;
    monthlyData: InteractionMonthlyData[];
  };
}

export interface DashboardFilters {
  month?: string; // Format: "2024-01"
  startDate?: string; // Format: "2024-01-01"
  endDate?: string; // Format: "2024-01-31"
  staffId?: string; // Staff ID for filtering
  branch?: string; // Branch filter
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  branch?: string;
  role?: 'staff' | 'admin';
}

export const dashboardApi = {
  // Get staff dashboard data
  getStaffDashboard: async (filters?: DashboardFilters): Promise<StaffDashboardData> => {
    const params = new URLSearchParams();
    
    if (filters?.month) params.append('month', filters.month);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const url = `/dashboard/staff${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get(url);
    return response.data.data;
  },

  // Get admin dashboard data
  getAdminDashboard: async (filters?: DashboardFilters): Promise<AdminDashboardData> => {
    const params = new URLSearchParams();
    
    if (filters?.month) params.append('month', filters.month);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.staffId) params.append('staffId', filters.staffId);

    const queryString = params.toString();
    const url = `/dashboard/admin${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get(url);
    return response.data.data;
  },

  // Get staff list for admin dashboard filter
  getStaffList: async (): Promise<Staff[]> => {
    const response = await apiClient.get('/dashboard/admin/staff');
    return response.data.data;
  },
};
