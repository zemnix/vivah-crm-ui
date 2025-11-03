import apiClient from './apiClient';

// Work Entry types based on backend model
export interface QuantityPair {
  quantity: number;
  size?: string;
}

export interface WorkEntry {
  _id: string;
  workerName: string;
  workName: string;
  quantity: number; // Total quantity (for backward compatibility)
  quantities: QuantityPair[]; // Array of quantity/size pairs
  size?: string; // Legacy field
  units: WorkUnit;
  remarks?: string;
  attachment?: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type WorkUnit = 
  | 'kg'
  | 'g'
  | 'pieces'
  | 'units'
  | 'other';

export interface WorkEntryCreateData {
  workerName?: string;
  workName: string;
  quantities: QuantityPair[]; // Array of quantity/size pairs
  units: WorkUnit;
  remarks?: string;
  attachmentFile?: File | null;
}

export interface WorkEntryUpdateData {
  workerName?: string;
  workName?: string;
  quantities?: QuantityPair[]; // Array of quantity/size pairs
  units?: WorkUnit;
  remarks?: string;
}

export interface WorkEntryQueryParams {
  page?: number;
  limit?: number;
  workerName?: string;
  workName?: string;
  units?: WorkUnit;
  search?: string;
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
}

export interface WorkEntryListResponse {
  workEntries: WorkEntry[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface WorkEntryStatsResponse {
  totalEntries: number;
  totalQuantity: number;
  avgQuantity: number;
  unitsDistribution: Record<string, { count: number; totalQuantity: number }>;
  dailyEntries: Array<{
    date: string;
    count: number;
    totalQuantity: number;
  }>;
  dailyWorkByUnit: Array<{
    date: string;
    kg: number;
    g: number;
    pieces: number;
    units: number;
    other: number;
  }>;
}

// Work Entry API functions
export const createWorkEntryApi = async (entryData: WorkEntryCreateData): Promise<WorkEntry> => {
  // If there is a file, send multipart/form-data
  if (entryData.attachmentFile) {
    const formData = new FormData();
    formData.append('workName', entryData.workName);
    formData.append('units', entryData.units);
    formData.append('quantities', JSON.stringify(entryData.quantities));
    if (entryData.workerName) formData.append('workerName', entryData.workerName);
    if (entryData.remarks) formData.append('remarks', entryData.remarks);
    formData.append('file', entryData.attachmentFile);

    const response = await apiClient.post('/work-entries', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  }

  const { attachmentFile, ...jsonData } = entryData;
  const response = await apiClient.post('/work-entries', jsonData);
  return response.data.data;
};

export const getWorkEntriesApi = async (params?: WorkEntryQueryParams): Promise<WorkEntryListResponse> => {
  const response = await apiClient.get('/work-entries', { params });
  return response.data.data;
};

export const getWorkEntryByIdApi = async (entryId: string): Promise<WorkEntry> => {
  const response = await apiClient.get(`/work-entries/${entryId}`);
  return response.data.data;
};

export const updateWorkEntryApi = async (entryId: string, updateData: WorkEntryUpdateData): Promise<WorkEntry> => {
  const response = await apiClient.put(`/work-entries/${entryId}`, updateData);
  return response.data.data;
};

export const deleteWorkEntryApi = async (entryId: string): Promise<void> => {
  await apiClient.delete(`/work-entries/${entryId}`);
};

export const getWorkEntryStatsApi = async (params?: { month?: string }): Promise<WorkEntryStatsResponse> => {
  const response = await apiClient.get('/work-entries/stats', { params });
  return response.data.data;
};

// Available units with labels
export const WORK_UNITS: Array<{ value: WorkUnit; label: string }> = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'pieces', label: 'Pieces' },
  { value: 'units', label: 'Units' },
  { value: 'other', label: 'Other' }
];

// Utility function to get unit label
export const getUnitLabel = (unit: WorkUnit): string => {
  const unitObj = WORK_UNITS.find(u => u.value === unit);
  return unitObj ? unitObj.label : unit;
};



