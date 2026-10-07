import apiClient from './apiClient';

export interface SiteInspectionItem {
  _id: string;
  site_inspection_id: string;
  item_name: string;
  measurement: string | null;
  nos: string | null;
  attachment_url: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SiteInspection {
  _id: string;
  lead_id: string;
  event_date: string;
  event_venue: string;
  event_type: string;
  venue_floor: string;
  visited_date: string | null;
  visited_by: string;
  remarks: string | null;
  items: SiteInspectionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SaveSiteInspectionData {
  event_date: string;
  event_type: string;
  venue_floor: string;
  visited_date: string | null;
  visited_by: string;
  remarks: string | null;
  items: Array<{
    item_name: string;
    measurement: string | null;
    nos: string | null;
    attachment_url: string | null;
  }>;
}

export const getSiteInspectionsByLeadIdApi = async (
  leadId: string
): Promise<SiteInspection[]> => {
  const response = await apiClient.get(`/site-inspections/lead/${leadId}`);
  return response.data.data;
};

export const initializeSiteInspectionsApi = async (
  leadId: string
): Promise<SiteInspection[]> => {
  const response = await apiClient.post(`/site-inspections/initialize/${leadId}`);
  return response.data.data;
};

export const saveSiteInspectionApi = async (
  leadId: string,
  data: SaveSiteInspectionData
): Promise<SiteInspection> => {
  const response = await apiClient.put(`/site-inspections/lead/${leadId}`, data);
  return response.data.data;
};
