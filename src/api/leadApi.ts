import apiClient from './apiClient';

// Lead types based on backend model
export interface Lead {
  _id: string;
  id: string;
  name: string;
  location?: string;
  district?: string;
  state?: string;
  pinCode?: number;
  source?: string;
  email?: string;
  mobile?: string;
  machineName?: string;
  description?: string;
  status: LeadStatus;
  createdBy: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus = 
  | 'new'
  | 'details_sent'
  | 'followup'
  | 'not_interested'
  | 'quotation_sent'
  | 'deal_done'
  | 'lost';

export interface LeadCreateData {
  name: string;
  location: string;
  district: string;
  state?: string;
  pinCode?: number;
  source: string;
  email?: string;
  mobile: string;
  machineName: string;
  description?: string;
  assignedTo?: string;
}

export interface LeadUpdateData {
  name?: string;
  location?: string;
  district?: string;
  state?: string;
  pinCode?: number;
  source?: string;
  email?: string;
  mobile?: string;
  machineName?: string;
  description?: string;
  status?: LeadStatus;
  assignedTo?: string;
}

export interface LeadQueryParams {
  page?: number;
  limit?: number;
  status?: LeadStatus | LeadStatus[]; // Allow multiple statuses
  assignedTo?: string;
  search?: string;
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
}

export interface LeadListResponse {
  leads: Lead[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface LeadStatsResponse {
  totalLeads: number;
  assignedLeads: number;
  unassignedLeads: number;
  statusDistribution: Record<LeadStatus, number>;
}

// Lead API functions
export const createLeadApi = async (leadData: LeadCreateData): Promise<Lead> => {
  const response = await apiClient.post('/leads', leadData);
  return response.data.data;
};

export const getLeadsApi = async (params?: LeadQueryParams): Promise<LeadListResponse> => {
  const response = await apiClient.get('/leads', { params });
  return response.data.data;
};

export const getLeadByIdApi = async (leadId: string): Promise<Lead> => {
  const response = await apiClient.get(`/leads/${leadId}`);
  return response.data.data;
};

export const updateLeadApi = async (leadId: string, updateData: LeadUpdateData): Promise<Lead> => {
  const response = await apiClient.put(`/leads/${leadId}`, updateData);
  return response.data.data;
};

export const deleteLeadApi = async (leadId: string): Promise<void> => {
  await apiClient.delete(`/leads/${leadId}`);
};

export const assignLeadApi = async (leadId: string, staffId: string | null): Promise<Lead> => {
  const response = await apiClient.put(`/leads/assign/${leadId}`, { assignedTo: staffId });
  return response.data.data;
};

export const getLeadStatsApi = async (): Promise<LeadStatsResponse> => {
  const response = await apiClient.get('/leads/stats');
  return response.data.data;
};

export const searchLeadsApi = async (searchQuery: string): Promise<Lead[]> => {
  const response = await apiClient.get('/leads/search', { 
    params: { q: searchQuery, limit: 10 } 
  });
  return response.data.data.leads;
};

// Utility function to get lead status color
export const getLeadStatusColor = (status: LeadStatus): string => {
  const colors: Record<LeadStatus, string> = {
    'new': 'bg-blue-100 text-blue-800',
    'details_sent': 'bg-purple-100 text-purple-800',
    'followup': 'bg-yellow-100 text-yellow-800',
    'not_interested': 'bg-red-100 text-red-800',
    'quotation_sent': 'bg-indigo-100 text-indigo-800',
    'deal_done': 'bg-green-100 text-green-800',
    'lost': 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

// Utility function to get lead status label
export const getLeadStatusLabel = (status: LeadStatus): string => {
  const labels: Record<LeadStatus, string> = {
    'new': 'New',
    'details_sent': 'Details Sent',
    'followup': 'Follow Up',
    'not_interested': 'Not Interested',
    'quotation_sent': 'Quotation Sent',
    'deal_done': 'Deal Done',
    'lost': 'Lost',
  };
  return labels[status] || status;
};