import apiClient from './apiClient';

export interface Item {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItemCreateData {
  name: string;
}

export interface ItemUpdateData {
  name?: string;
}

export interface ItemQueryParams {
  search?: string;
  limit?: number;
}

export const createItemApi = async (itemData: ItemCreateData): Promise<Item> => {
  const response = await apiClient.post('/items', itemData);
  return response.data.data;
};

export const getItemsApi = async (params?: ItemQueryParams): Promise<Item[]> => {
  const response = await apiClient.get('/items', { params });
  return response.data.data;
};

export const getItemByIdApi = async (itemId: string): Promise<Item> => {
  const response = await apiClient.get(`/items/${itemId}`);
  return response.data.data;
};

export const updateItemApi = async (itemId: string, updateData: ItemUpdateData): Promise<Item> => {
  const response = await apiClient.put(`/items/${itemId}`, updateData);
  return response.data.data;
};

export const deleteItemApi = async (itemId: string): Promise<void> => {
  await apiClient.delete(`/items/${itemId}`);
};

