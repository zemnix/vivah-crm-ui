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

export interface LeadProductionSheet {
  _id?: string;
  leadId: string;
  dates: LeadProductionDateSet;
  productions: LeadProductionGroup[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadProductionUpsertData {
  dates: LeadProductionDateSet;
  productions: LeadProductionGroup[];
}

export const createEmptyLeadProductionSheet = (leadId: string): LeadProductionSheet => ({
  leadId,
  dates: {
    productionDate: null,
    preProductionDate: null,
    postProductionDate: null,
  },
  productions: [],
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
