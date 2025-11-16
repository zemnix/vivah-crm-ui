import apiClient from './apiClient';
import { Customer } from './leadApi';

// Types of Event for Enquiry (simpler than Lead - no date or dayNight)
export interface EnquiryTypeOfEvent {
  name: string;
  numberOfGuests: number;
}

// Enquiry types based on backend model
export interface Enquiry {
  _id: string;
  customer: Customer;
  typesOfEvent: EnquiryTypeOfEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface EnquiryCreateData {
  customer: Customer;
  typesOfEvent: EnquiryTypeOfEvent[];
}

export interface EnquiryUpdateData {
  customer?: Partial<Customer>;
  typesOfEvent?: EnquiryTypeOfEvent[];
}

export interface EnquiryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
}

export interface EnquiryListResponse {
  enquiries: Enquiry[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

// Data for converting enquiry to lead
export interface ConvertEnquiryToLeadData {
  assignedTo?: string;
  typesOfEvent?: Array<{
    name: string;
    date: string; // ISO date string
    dayNight: 'day' | 'night' | 'both';
    numberOfGuests: number;
  }>;
  baraatDetails?: Record<string, string | number | null>;
}

// Enquiry API functions
export const createEnquiryApi = async (enquiryData: EnquiryCreateData): Promise<Enquiry> => {
  const response = await apiClient.post('/enquiries', enquiryData);
  return response.data.data;
};

export const getEnquiriesApi = async (params?: EnquiryQueryParams): Promise<EnquiryListResponse> => {
  const response = await apiClient.get('/enquiries', { params });
  return response.data.data;
};

export const getEnquiryByIdApi = async (enquiryId: string): Promise<Enquiry> => {
  const response = await apiClient.get(`/enquiries/${enquiryId}`);
  return response.data.data;
};

export const updateEnquiryApi = async (enquiryId: string, updateData: EnquiryUpdateData): Promise<Enquiry> => {
  const response = await apiClient.put(`/enquiries/${enquiryId}`, updateData);
  return response.data.data;
};

export const deleteEnquiryApi = async (enquiryId: string): Promise<void> => {
  await apiClient.delete(`/enquiries/${enquiryId}`);
};

export const convertEnquiryToLeadApi = async (enquiryId: string, convertData: ConvertEnquiryToLeadData): Promise<any> => {
  const response = await apiClient.post(`/enquiries/${enquiryId}/convert`, convertData);
  return response.data.data;
};

