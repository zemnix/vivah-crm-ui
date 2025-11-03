import apiClient from './apiClient';

export interface Source {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceCreateData {
  name: string;
  description?: string;
}

// Get all sources
export const getSourcesApi = async (): Promise<Source[]> => {
  const response = await apiClient.get('/sources');
  return response.data.data;
};

// Create a new source
export const createSourceApi = async (sourceData: SourceCreateData): Promise<Source> => {
  const response = await apiClient.post('/sources', sourceData);
  return response.data.data;
};

// Get source by ID
export const getSourceByIdApi = async (id: string): Promise<Source> => {
  const response = await apiClient.get(`/sources/${id}`);
  return response.data.data;
};
