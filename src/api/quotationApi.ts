import apiClient from './apiClient';

// Quotation types based on backend model
export interface QuotationItem {
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  gstPercent: number;
  gstAmount: number;
  total: number;
}

export interface QuotationCustomer {
  name: string;
  address: string;
  mobile: string;
  email?: string;
  gst?: string;
}

export interface AdditionalCharge {
  name: string;
  amount: number;
}

export interface Quotation {
  _id: string;
  leadId: {
    _id: string;
    name: string;
    email: string;
  };
  staffId: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  quotationNo: string;
  quotationTitle: string;
  date: string;
  customer: QuotationCustomer;
  items: QuotationItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  shippingTax: number;
  additionalCharges: AdditionalCharge[];
  grandTotal: number;
  notes: string;
  validityDate?: string;
  status: QuotationStatus;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

export interface QuotationCreateData {
  leadId: string;
  staffId: string;
  quotationTitle?: string;
  date?: string;
  customer: QuotationCustomer;
  items: QuotationItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  shippingTax: number;
  additionalCharges: AdditionalCharge[];
  grandTotal: number;
  notes?: string;
  validityDate?: string;
  status?: QuotationStatus;
}

export interface QuotationUpdateData {
  leadId?: string;
  staffId?: string;
  quotationTitle?: string;
  date?: string;
  customer?: QuotationCustomer;
  items?: QuotationItem[];
  subtotal?: number;
  tax?: number;
  shippingCost?: number;
  shippingTax?: number;
  additionalCharges?: AdditionalCharge[];
  grandTotal?: number;
  notes?: string;
  validityDate?: string;
  status?: QuotationStatus;
  pdfUrl?: string;
}

export interface QuotationQueryParams {
  page?: number;
  limit?: number;
  leadId?: string;
  staffId?: string;
  status?: QuotationStatus | QuotationStatus[];
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface QuotationListResponse {
  quotations: Quotation[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

// Quotation API functions
export const createQuotationApi = async (quotationData: QuotationCreateData): Promise<Quotation> => {
  const response = await apiClient.post('/quotations', quotationData);
  return response.data.data;
};

export const getQuotationsApi = async (params?: QuotationQueryParams): Promise<QuotationListResponse> => {
  const response = await apiClient.get('/quotations', { params });
  return response.data.data;
};

export const getQuotationByIdApi = async (quotationId: string): Promise<Quotation> => {
  const response = await apiClient.get(`/quotations/${quotationId}`);
  return response.data.data;
};

export const updateQuotationApi = async (quotationId: string, updateData: QuotationUpdateData): Promise<Quotation> => {
  const response = await apiClient.put(`/quotations/${quotationId}`, updateData);
  return response.data.data;
};

export const deleteQuotationApi = async (quotationId: string): Promise<void> => {
  await apiClient.delete(`/quotations/${quotationId}`);
};

// Utility function to get quotation status color
export const getQuotationStatusColor = (status: QuotationStatus): string => {
  const colors: Record<QuotationStatus, string> = {
    'draft': 'bg-gray-100 text-gray-800',
    'sent': 'bg-blue-100 text-blue-800',
    'accepted': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

// Utility function to get quotation status label
export const getQuotationStatusLabel = (status: QuotationStatus): string => {
  const labels: Record<QuotationStatus, string> = {
    'draft': 'Draft',
    'sent': 'Sent',
    'accepted': 'Accepted',
    'rejected': 'Rejected',
  };
  return labels[status] || status;
};

// Utility function to calculate item total
export const calculateItemTotal = (item: Pick<QuotationItem, 'quantity' | 'unitPrice' | 'gstPercent'>): number => {
  const subtotal = item.quantity * item.unitPrice;
  const gstAmount = (subtotal * item.gstPercent) / 100;
  return subtotal + gstAmount;
};

// Utility function to calculate quotation totals
export const calculateQuotationTotals = (
  items: QuotationItem[],
  shippingCost: number = 0,
  shippingTax: number = 0,
  additionalCharges: AdditionalCharge[] = []
): { subtotal: number; tax: number; additionalChargesTotal: number; grandTotal: number } => {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const tax = items.reduce((sum, item) => sum + item.gstAmount, 0);
  const additionalChargesTotal = additionalCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
  const grandTotal = subtotal + tax + shippingCost + shippingTax + additionalChargesTotal;
  
  return {
    subtotal,
    tax,
    additionalChargesTotal,
    grandTotal
  };
};

