import apiClient from './apiClient';

// Activity types based on backend model
export interface Activity {
  _id: string;
  leadId: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  type: ActivityType;
  meta: Record<string, any>;
  refId?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type ActivityType = 
  | 'status_change'
  | 'interaction'
  | 'quotation'
  | 'service_request';

export interface ActivityListResponse {
  activities: Activity[];
}

// Activity API functions
export const getLeadActivitiesApi = async (leadId: string): Promise<Activity[]> => {
  const response = await apiClient.get(`/activities/lead/${leadId}`);
  return response.data.data;
};

// Utility function to get activity type color
export const getActivityTypeColor = (type: ActivityType): string => {
  const colors: Record<ActivityType, string> = {
    'status_change': 'bg-blue-100 text-blue-800',
    'interaction': 'bg-green-100 text-green-800',
    'quotation': 'bg-orange-100 text-orange-800',
    'service_request': 'bg-purple-100 text-purple-800',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};

// Utility function to get activity type label
export const getActivityTypeLabel = (type: ActivityType): string => {
  const labels: Record<ActivityType, string> = {
    'status_change': 'Status Change',
    'interaction': 'Interaction',
    'quotation': 'Quotation',
    'service_request': 'Service Request',
  };
  return labels[type] || type;
};