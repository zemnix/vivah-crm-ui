import apiClient from './apiClient';
import { 
  Interaction, 
  InteractionData, 
  InteractionFilters, 
  InteractionType, 
  CallStatus 
} from '../lib/schema';

// Re-export types for use in stores
export type { 
  Interaction, 
  InteractionData, 
  InteractionFilters, 
  InteractionType, 
  CallStatus 
};

export interface InteractionListResponse {
  interactions: Interaction[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface InteractionStatsResponse {
  totalInteractions: number;
  completedInteractions: number;
  pendingInteractions: number;
  statusDistribution: Record<CallStatus, number>;
  typeDistribution: Record<InteractionType, number>;
}

// Interaction API functions
export const createInteractionApi = async (interactionData: InteractionData): Promise<Interaction> => {
  const response = await apiClient.post('/interactions', interactionData);
  return response.data.data;
};

export const getInteractionsApi = async (params?: InteractionFilters): Promise<InteractionListResponse> => {
  const response = await apiClient.get('/interactions', { params });
  return response.data.data;
};

export const getInteractionByIdApi = async (interactionId: string): Promise<Interaction> => {
  const response = await apiClient.get(`/interactions/${interactionId}`);
  return response.data.data;
};

export const updateInteractionApi = async (
  interactionId: string, 
  updateData: Partial<InteractionData>
): Promise<Interaction> => {
  const response = await apiClient.put(`/interactions/${interactionId}`, updateData);
  return response.data.data;
};

export const deleteInteractionApi = async (interactionId: string): Promise<void> => {
  await apiClient.delete(`/interactions/${interactionId}`);
};

export const getInteractionStatsApi = async (): Promise<InteractionStatsResponse> => {
  const response = await apiClient.get('/interactions/stats');
  return response.data.data;
};

// Utility functions
export const getInteractionStatusColor = (status: CallStatus): string => {
  const colors: Record<CallStatus, string> = {
    'scheduled': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'missed': 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getInteractionTypeIcon = (type: InteractionType): string => {
  const icons: Record<InteractionType, string> = {
    'call': '📞',
    'meeting': '🤝',
  };
  return icons[type] || '📝';
};

export const formatInteractionDate = (date: string | { formatted: string }): string => {
  if (typeof date === 'object' && date.formatted) {
    return date.formatted;
  }
  return new Date(typeof date === 'string' ? date : date.formatted).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};