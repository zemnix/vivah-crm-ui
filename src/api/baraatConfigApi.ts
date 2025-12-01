import apiClient from './apiClient';

// Baraat Field Config types based on simplified backend model
export interface BaraatFieldConfig {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface BaraatFieldConfigCreateData {
  name: string;
}

export interface BaraatFieldConfigUpdateData {
  name?: string;
}

// Baraat Field Config API functions
export const createBaraatFieldConfigApi = async (
  fieldData: BaraatFieldConfigCreateData
): Promise<BaraatFieldConfig> => {
  const response = await apiClient.post('/baraat-config', fieldData);
  return response.data.data;
};

export const getActiveBaraatFieldConfigsApi = async (): Promise<BaraatFieldConfig[]> => {
  const response = await apiClient.get('/baraat-config/active');
  return response.data.data;
};

export const getAllBaraatFieldConfigsApi = async (): Promise<BaraatFieldConfig[]> => {
  const response = await apiClient.get('/baraat-config');
  return response.data.data;
};

export const updateBaraatFieldConfigApi = async (
  fieldId: string,
  updateData: BaraatFieldConfigUpdateData
): Promise<BaraatFieldConfig> => {
  const response = await apiClient.put(`/baraat-config/${fieldId}`, updateData);
  return response.data.data;
};

export const deleteBaraatFieldConfigApi = async (
  fieldId: string,
  hardDelete: boolean = false
): Promise<void> => {
  await apiClient.delete(`/baraat-config/${fieldId}`, {
    params: { hardDelete: hardDelete.toString() },
  });
};

