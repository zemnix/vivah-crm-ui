import apiClient from './apiClient';

export interface District {
  _id: string;
  name: string;
  state: string;
  createdAt: string;
  updatedAt: string;
}

export interface DistrictCreateData {
  name: string;
  state?: string;
}

// Get all districts
export const getDistrictsApi = async (): Promise<District[]> => {
  const response = await apiClient.get('/districts');
  return response.data.data;
};

// Create a new district
export const createDistrictApi = async (districtData: DistrictCreateData): Promise<District> => {
  const response = await apiClient.post('/districts', districtData);
  return response.data.data;
};

// Get district by ID
export const getDistrictByIdApi = async (id: string): Promise<District> => {
  const response = await apiClient.get(`/districts/${id}`);
  return response.data.data;
};
