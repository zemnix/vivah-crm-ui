import apiClient from './apiClient';

// Baraat Field Config types based on backend model
export type FieldType = 'text' | 'number' | 'textarea' | 'dropdown';

export interface BaraatFieldConfig {
  _id: string;
  label: string;
  key: string;
  type: FieldType;
  dropdownOptions?: string[];
  required: boolean;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BaraatFieldConfigCreateData {
  label: string;
  key?: string; // Auto-generated from label if not provided
  type: FieldType;
  dropdownOptions?: string[]; // Required if type is 'dropdown'
  required?: boolean;
  order?: number;
  isActive?: boolean;
}

export interface BaraatFieldConfigUpdateData {
  label?: string;
  key?: string;
  type?: FieldType;
  dropdownOptions?: string[];
  required?: boolean;
  order?: number;
  isActive?: boolean;
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

