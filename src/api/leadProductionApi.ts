import apiClient from './apiClient';

export interface LeadProductionDateSet {
  productionDate: string | null;
  preProductionDate: string | null;
  postProductionDate: string | null;
}

export interface LeadProductionItem {
  _id?: string;
  name: string;
  preProductionQuantity: string;
  postProductionQuantity: string;
}

export interface LeadProductionGroup {
  _id?: string;
  name: string;
  items: LeadProductionItem[];
}

export interface LeadProductionEventSheet {
  _id?: string;
  eventName: string;
  eventDate: string;
  eventVenue?: string;
  dates: LeadProductionDateSet;
  productions: LeadProductionGroup[];
}

export interface LeadProductionSheet {
  _id?: string;
  leadId: string;
  eventSheets: LeadProductionEventSheet[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadProductionUpsertData {
  eventSheets: LeadProductionEventSheet[];
}

export const createEmptyLeadProductionSheet = (leadId: string): LeadProductionSheet => ({
  leadId,
  eventSheets: [],
});

export const getLeadProductionByLeadIdApi = async (leadId: string): Promise<LeadProductionSheet> => {
  const response = await apiClient.get(`/lead-production/lead/${leadId}`);
  return response.data.data;
};

export const upsertLeadProductionByLeadIdApi = async (
  leadId: string,
  data: LeadProductionUpsertData
): Promise<LeadProductionSheet> => {
  const response = await apiClient.put(`/lead-production/lead/${leadId}`, data);
  return response.data.data;
};
