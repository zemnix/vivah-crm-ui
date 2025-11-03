import apiClient from './apiClient';

export interface UploadResponse {
  message: string;
  fileURL: string;
}

export const uploadFileApi = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};
