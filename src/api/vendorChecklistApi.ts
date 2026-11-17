import apiClient from './apiClient';

export type VendorMasterKind = 'vendor' | 'vendor-name';
export interface VendorMasterEntry { _id: string; name: string }
export interface VendorMasterList { items: VendorMasterEntry[]; total: number; page: number; limit: number }
export const VENDOR_CHECKLIST_STATUSES = ['Booked', 'Not started', 'In progress', 'Done'] as const;
export type VendorChecklistStatus = typeof VENDOR_CHECKLIST_STATUSES[number];

export interface VendorChecklistRow {
  _id?: string;
  particulars: string;
  assignee: string;
  vendor: string;
  vendorName: string;
  responsiblePerson: string;
  status: VendorChecklistStatus;
  time: string;
  remarks: string;
}

export interface VendorChecklist {
  _id?: string;
  leadId: string;
  eventName: string;
  eventDate: string;
  rows: VendorChecklistRow[];
}

export const listVendorMastersApi = async (
  kind: VendorMasterKind,
  params: { search?: string; page?: number; limit?: number } = {},
): Promise<VendorMasterList> => (await apiClient.get(`/vendor-checklists/masters/${kind}`, { params })).data.data;

export const createVendorMasterApi = async (kind: VendorMasterKind, name: string): Promise<VendorMasterEntry> =>
  (await apiClient.post(`/vendor-checklists/masters/${kind}`, { name })).data.data;

export const updateVendorMasterApi = async (kind: VendorMasterKind, id: string, name: string): Promise<VendorMasterEntry> =>
  (await apiClient.put(`/vendor-checklists/masters/${kind}/${id}`, { name })).data.data;

export const deleteVendorMasterApi = async (kind: VendorMasterKind, id: string): Promise<void> => {
  await apiClient.delete(`/vendor-checklists/masters/${kind}/${id}`);
};

export const getVendorChecklistsApi = async (leadId: string): Promise<VendorChecklist[]> =>
  (await apiClient.get(`/vendor-checklists/lead/${leadId}`)).data.data;

export const saveVendorChecklistApi = async (
  leadId: string,
  data: Pick<VendorChecklist, 'eventName' | 'eventDate' | 'rows'>,
): Promise<VendorChecklist> => (await apiClient.put(`/vendor-checklists/lead/${leadId}`, data)).data.data;
