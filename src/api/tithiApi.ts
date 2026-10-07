import apiClient from './apiClient';

export interface Tithi {
  _id: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export const getTithisApi = async (): Promise<Tithi[]> => {
  const response = await apiClient.get('/tithis');
  return response.data.data;
};

export const replaceTithisApi = async (dates: string[]): Promise<Tithi[]> => {
  const response = await apiClient.put('/tithis', { dates });
  return response.data.data;
};
