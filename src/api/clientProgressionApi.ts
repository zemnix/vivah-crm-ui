import apiClient from './apiClient';

export type ProgressionStatus = 'Not started' | 'In progress' | 'Completed';
export type EventStatus = 'Booked' | 'Not started' | 'In progress' | 'Completed' | 'Cancelled';

export interface ClientProgression {
  _id: string;
  leadId: string;
  eventName: string;
  eventDate: string; // ISO date string
  venue: string;
  status: EventStatus;
  ppt: ProgressionStatus;
  site: ProgressionStatus;
  twoD: ProgressionStatus;
  excelDetailing: ProgressionStatus;
  contractForm: ProgressionStatus;
  eventPaymentDetails: ProgressionStatus;
  eventBudget: ProgressionStatus;
  vendorData: ProgressionStatus;
  crewManagement: ProgressionStatus;
  checklist: ProgressionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ClientProgressionCreateData {
  leadId: string;
  eventName: string;
  eventDate: string; // ISO date string
  venue?: string;
  status?: EventStatus;
  ppt?: ProgressionStatus;
  site?: ProgressionStatus;
  twoD?: ProgressionStatus;
  excelDetailing?: ProgressionStatus;
  contractForm?: ProgressionStatus;
  eventPaymentDetails?: ProgressionStatus;
  eventBudget?: ProgressionStatus;
  vendorData?: ProgressionStatus;
  crewManagement?: ProgressionStatus;
  checklist?: ProgressionStatus;
}

export interface ClientProgressionUpdateData {
  venue?: string;
  status?: EventStatus;
  ppt?: ProgressionStatus;
  site?: ProgressionStatus;
  twoD?: ProgressionStatus;
  excelDetailing?: ProgressionStatus;
  contractForm?: ProgressionStatus;
  eventPaymentDetails?: ProgressionStatus;
  eventBudget?: ProgressionStatus;
  vendorData?: ProgressionStatus;
  crewManagement?: ProgressionStatus;
  checklist?: ProgressionStatus;
}

// Get all progression records for a lead
export const getProgressionByLeadIdApi = async (leadId: string): Promise<ClientProgression[]> => {
  const response = await apiClient.get(`/client-progression/lead/${leadId}`);
  return response.data.data;
};

// Create or update a progression record
export const upsertProgressionApi = async (data: ClientProgressionCreateData): Promise<ClientProgression> => {
  const response = await apiClient.post('/client-progression', data);
  return response.data.data;
};

// Update a specific progression record
export const updateProgressionApi = async (
  progressionId: string,
  data: ClientProgressionUpdateData
): Promise<ClientProgression> => {
  const response = await apiClient.put(`/client-progression/${progressionId}`, data);
  return response.data.data;
};

// Initialize progression records from lead events
export const initializeProgressionApi = async (leadId: string): Promise<ClientProgression[]> => {
  const response = await apiClient.post(`/client-progression/initialize/${leadId}`);
  return response.data.data;
};

