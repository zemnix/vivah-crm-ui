import apiClient from './apiClient';

// Event Config types based on simplified backend model
export interface EventConfig {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventConfigCreateData {
  name: string;
}

export interface EventConfigUpdateData {
  name?: string;
}

// Event Config API functions
export const createEventConfigApi = async (
  eventData: EventConfigCreateData
): Promise<EventConfig> => {
  const response = await apiClient.post('/event-config', eventData);
  return response.data.data;
};

export const getActiveEventConfigsApi = async (): Promise<EventConfig[]> => {
  const response = await apiClient.get('/event-config/active');
  return response.data.data;
};

export const getAllEventConfigsApi = async (): Promise<EventConfig[]> => {
  const response = await apiClient.get('/event-config');
  return response.data.data;
};

export const getEventConfigByIdApi = async (eventId: string): Promise<EventConfig> => {
  const response = await apiClient.get(`/event-config/${eventId}`);
  return response.data.data;
};

export const updateEventConfigApi = async (
  eventId: string,
  updateData: EventConfigUpdateData
): Promise<EventConfig> => {
  const response = await apiClient.put(`/event-config/${eventId}`, updateData);
  return response.data.data;
};

export const deleteEventConfigApi = async (eventId: string, hardDelete = false): Promise<void> => {
  await apiClient.delete(`/event-config/${eventId}`, {
    params: { hardDelete: hardDelete ? 'true' : 'false' }
  });
};

