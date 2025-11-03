import apiClient from './apiClient';

// Business interfaces based on backend model
export interface BusinessBankDetails {
  beneficiary?: string;
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  ifscCode?: string;
}

export interface Business {
  _id: string;
  name: string;
  gstin?: string;
  address?: string;
  phone?: string[];
  email?: string;
  website?: string;
  bankDetails?: BusinessBankDetails;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessCreateData {
  name: string;
  gstin?: string;
  address?: string;
  phone?: string[];
  email?: string;
  website?: string;
  bankDetails?: BusinessBankDetails;
  logoUrl?: string;
}

export interface BusinessUpdateData {
  name?: string;
  gstin?: string;
  address?: string;
  phone?: string[];
  email?: string;
  website?: string;
  bankDetails?: BusinessBankDetails;
  logoUrl?: string;
}

// API Functions
export const createBusinessApi = async (businessData: BusinessCreateData): Promise<Business> => {
  try {
    const response = await apiClient.post('/business', businessData);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to create business profile');
  }
};

export const getBusinessApi = async (): Promise<Business> => {
  try {
    const response = await apiClient.get('/business');
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch business profile');
  }
};

export const updateBusinessApi = async (businessData: BusinessUpdateData): Promise<Business> => {
  try {
    const response = await apiClient.put('/business', businessData);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to update business profile');
  }
};

export const deleteBusinessApi = async (): Promise<{ message: string }> => {
  try {
    const response = await apiClient.delete('/business');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to delete business profile');
  }
};
