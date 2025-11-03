// TypeScript types and constants for the CRM

// Lead status enum - Updated to match backend model
export const leadStatuses = ['new', 'details_sent', 'followup', 'not_interested', 'quotation_sent', 'deal_done', 'lost'] as const;
export type LeadStatus = typeof leadStatuses[number];

// Call/Interaction status enum  
export const callStatuses = ['scheduled', 'completed', 'missed'] as const;
export type CallStatus = typeof callStatuses[number];

// Interaction types
export const interactionTypes = ['call', 'meeting'] as const;
export type InteractionType = typeof interactionTypes[number];

// Meeting status enum
export const meetingStatuses = ['scheduled', 'completed'] as const;
export type MeetingStatus = typeof meetingStatuses[number];

// Quotation status enum
export const quotationStatuses = ['draft', 'sent', 'accepted', 'rejected'] as const;
export type QuotationStatus = typeof quotationStatuses[number];

// Service request status enum
export const serviceRequestStatuses = ['pending', 'in_progress', 'resolved'] as const;
export type ServiceRequestStatus = typeof serviceRequestStatuses[number];

// Service request priority enum
export const servicePriorities = ['low', 'medium', 'high'] as const;
export type ServicePriority = typeof servicePriorities[number];

// User roles enum
export const userRoles = ['admin', 'staff', 'technician'] as const;
export type UserRole = typeof userRoles[number];

// Machine types
export interface Machine {
  _id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MachineCreateData {
  name: string;
  description?: string;
}

export interface MachineUpdateData {
  name?: string;
  description?: string;
}

// User types
export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  mobile?: string;
}

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  mobile?: string;
  password?: string;
  phone?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
}

// Lead types - Updated to match backend model exactly
export interface Lead {
  _id: string;
  id: string;
  name: string;
  location?: string;
  district?: string;
  state?: string;
  pinCode?: number;
  source?: string;
  email?: string;
  mobile?: string;
  machineName?: string;
  description?: string;
  status: LeadStatus;
  createdBy: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LeadData {
  name: string;
  location: string;
  district: string;
  state?: string;
  pinCode?: number;
  source: string;
  email?: string;
  mobile: string;
  machineName: string;
  description?: string;
  status?: LeadStatus;
  assignedTo?: string;
}

// Call types
export interface Call {
  id: string;
  leadId: string;
  staffId: string;
  datetime: string;
  durationSec?: number;
  status: CallStatus;
  notes?: string;
  nextActionDate?: string;
  createdAt: string;
}

// Meeting types
export interface Meeting {
  id: string;
  leadId: string;
  staffId: string;
  datetime: string;
  locationType?: string;
  location?: string;
  notes?: string;
  status: MeetingStatus;
  createdAt: string;
}

// Quotation types
export interface QuotationCustomer {
  name?: string;
  address?: string;
  mobile?: string;
  email?: string;
  gst?: string;
}

export interface QuotationItem {
  product?: string;
  productName?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  gstPercent?: number;
  gstAmount?: number;
  taxPct?: number;
  total?: number;
}

export interface Quotation {
  id: string;
  leadId?: string;
  staffId?: string;
  number?: string;
  quotationNo?: string;
  date?: string;
  customer?: QuotationCustomer;
  items?: QuotationItem[];
  subtotal?: string | number;
  tax?: number;
  taxTotal?: string;
  shippingCost?: number;
  grandTotal?: string | number;
  terms?: string[] | string;
  notes?: string;
  status: QuotationStatus;
  validityDate?: string;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationData {
  leadId: string;
  staffId: string;
  quotationNo?: string;
  date?: string;
  customer?: QuotationCustomer;
  items?: QuotationItem[];
  subtotal?: number;
  tax?: number;
  shippingCost?: number;
  grandTotal?: number;
  terms?: string[];
  notes?: string;
  status?: QuotationStatus;
  pdfUrl?: string;
}

// Business types
export interface BankDetails {
  beneficiary?: string;
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  ifscCode?: string;
}

export interface Business {
  id: string;
  name: string;
  gstin?: string;
  address?: string;
  phone?: string[];
  email?: string;
  website?: string;
  bankDetails?: BankDetails;
  logoUrl?: string;
}

export interface BusinessData {
  name: string;
  gstin?: string;
  address?: string;
  phone?: string[];
  email?: string;
  website?: string;
  bankDetails?: BankDetails;
  logoUrl?: string;
}

// Interaction types - Updated to match backend model
export interface Interaction {
  _id: string;
  id: string;
  leadId: {
    _id: string;
    name: string;
    email?: string;
    mobile?: string;
    status: LeadStatus;
    location?: string;
  };
  staffId: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  type: InteractionType;
  status: CallStatus;
  date: {
    iso: string;
    formatted: string;
    timestamp: number;
  } | string;
  initialNotes: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InteractionData {
  leadId: string;
  staffId: string;
  type: InteractionType;
  status?: CallStatus;
  date: string;
  initialNotes: string;
  remarks?: string;
}

// Activity types - Based on backend activity model
export interface Activity {
  _id: string;
  leadId: string;
  userId: string;
  type: 'status_change' | 'interaction' | 'quotation' | 'service_request';
  meta: Record<string, any>;
  refId?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Service Request types - Updated to match backend model
export interface ServiceRequest {
  _id: string;
  id: string;
  leadId: {
    _id: string;
    name: string;
    email?: string;
    mobile?: string;
  };
  createdBy: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  technicianId?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  issue: string;
  priority: ServicePriority;
  status: ServiceRequestStatus;
  resolvedPhoto?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRequestData {
  leadId: string;
  issue: string;
  priority?: ServicePriority;
  description?: string;
  technicianId?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

// Utility types for forms and filtering
export interface LeadFilters {
  status?: LeadStatus;
  assignedTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface InteractionFilters {
  leadId?: string;
  staffId?: string;
  type?: InteractionType;
  status?: CallStatus;
  page?: number;
  limit?: number;
}





