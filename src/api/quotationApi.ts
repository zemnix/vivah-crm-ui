import apiClient from './apiClient';

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

export interface QuotationItem {
  category: string;
  itemName: string;
  nos: string;
  price: number;
  // Backward-compatible optional fields still used in legacy files.
  productName?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  gstPercent?: number;
  gstAmount?: number;
  total?: number;
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

export interface QuotationLeadRef {
  _id: string;
  name: string;
  email: string;
}

export interface QuotationStaffRef {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface Quotation {
  _id: string;
  leadId: QuotationLeadRef;
  staffId: QuotationStaffRef;
  quotationNo: string;
  quotationTitle?: string;
  date?: string;
  customer: QuotationCustomer;
  items: QuotationItem[];
  additionalCharges?: AdditionalCharge[];
  grandTotal: number;
  notes?: string;
  validityDate?: string;
  status: QuotationStatus;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
  // Backward-compatible optional totals.
  subtotal?: number;
  tax?: number;
  shippingCost?: number;
  shippingTax?: number;
}

export interface QuotationCreateData {
  leadId: string;
  staffId: string;
  quotationTitle?: string;
  date?: string;
  customer: QuotationCustomer;
  items: QuotationItem[];
  additionalCharges?: AdditionalCharge[];
  grandTotal: number;
  notes?: string;
  validityDate?: string;
  status?: QuotationStatus;
  pdfUrl?: string;
}

export interface QuotationUpdateData {
  leadId?: string;
  staffId?: string;
  quotationTitle?: string;
  date?: string;
  customer?: QuotationCustomer;
  items?: QuotationItem[];
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

export const updateQuotationApi = async (
  quotationId: string,
  updateData: QuotationUpdateData
): Promise<Quotation> => {
  const response = await apiClient.put(`/quotations/${quotationId}`, updateData);
  return response.data.data;
};

export const deleteQuotationApi = async (quotationId: string): Promise<void> => {
  await apiClient.delete(`/quotations/${quotationId}`);
};

export const getQuotationStatusColor = (status: QuotationStatus): string => {
  const colors: Record<QuotationStatus, string> = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getQuotationStatusLabel = (status: QuotationStatus): string => {
  const labels: Record<QuotationStatus, string> = {
    draft: 'Draft',
    sent: 'Sent',
    accepted: 'Accepted',
    rejected: 'Rejected',
  };
  return labels[status] || status;
};

export const calculateItemTotal = (item: QuotationItem): number => {
  if (typeof item.price === 'number' && Number.isFinite(item.price)) {
    return item.price;
  }
  if (typeof item.total === 'number' && Number.isFinite(item.total)) {
    return item.total;
  }
  const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
  const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
  return quantity * unitPrice;
};

// Backward-compatible argument order.
export const calculateQuotationTotals = (
  items: QuotationItem[],
  shippingCost: number = 0,
  shippingTax: number = 0,
  additionalCharges: AdditionalCharge[] = []
): { subtotal: number; tax: number; additionalChargesTotal: number; grandTotal: number } => {
  const subtotal = items.reduce((sum, item) => {
    const fallback = calculateItemTotal(item);
    const amount = typeof item.price === 'number' ? item.price : fallback;
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  const tax = items.reduce((sum, item) => {
    if (typeof item.gstAmount === 'number' && Number.isFinite(item.gstAmount)) {
      return sum + item.gstAmount;
    }
    return sum;
  }, 0);

  const additionalChargesTotal = additionalCharges.reduce((sum, charge) => {
    const amount = typeof charge.amount === 'number' ? charge.amount : 0;
    return sum + amount;
  }, 0);

  const grandTotal = subtotal + tax + shippingCost + shippingTax + additionalChargesTotal;

  return {
    subtotal,
    tax,
    additionalChargesTotal,
    grandTotal,
  };
};
