import apiClient from './apiClient';

// SFX Config types based on simplified backend model
export interface SfxConfig {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SfxConfigCreateData {
  name: string;
}

export interface SfxConfigUpdateData {
  name?: string;
}

// SFX Config API functions
export const createSfxConfigApi = async (
  sfxData: SfxConfigCreateData
): Promise<SfxConfig> => {
  const response = await apiClient.post('/sfx-config', sfxData);
  return response.data.data;
};

export const getActiveSfxConfigsApi = async (): Promise<SfxConfig[]> => {
  const response = await apiClient.get('/sfx-config/active');
  return response.data.data;
};

export const getAllSfxConfigsApi = async (): Promise<SfxConfig[]> => {
  const response = await apiClient.get('/sfx-config');
  return response.data.data;
};

export const getSfxConfigByIdApi = async (sfxId: string): Promise<SfxConfig> => {
  const response = await apiClient.get(`/sfx-config/${sfxId}`);
  return response.data.data;
};

export const updateSfxConfigApi = async (
  sfxId: string,
  updateData: SfxConfigUpdateData
): Promise<SfxConfig> => {
  const response = await apiClient.put(`/sfx-config/${sfxId}`, updateData);
  return response.data.data;
};

export const deleteSfxConfigApi = async (sfxId: string, hardDelete = false): Promise<void> => {
  await apiClient.delete(`/sfx-config/${sfxId}`, {
    params: { hardDelete: hardDelete ? 'true' : 'false' }
  });
};

