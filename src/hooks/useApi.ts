import { useState, useEffect } from 'react';
import type { Lead, Call, Meeting, Quotation, ServiceRequest, User } from '@/lib/schema';

// Mock data
const mockLeads: Lead[] = [
  {
    _id: '1',
    id: '1',
    name: 'John Smith',
    email: 'john@techcorp.com',
    mobile: '+1234567890',
    source: 'Website',
    status: 'new',
    createdBy: { _id: 'staff1', name: 'Alice Johnson', email: 'alice@company.com', role: 'staff' },
    createdAt: '2025-08-20T10:00:00Z',
    updatedAt: '2025-08-20T10:00:00Z'
  },
  {
    _id: '2',
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah@abc.com',
    mobile: '+1987654321',
    source: 'Referral',
    status: 'followup',
    createdBy: { _id: 'staff2', name: 'Bob Smith', email: 'bob@company.com', role: 'staff' },
    createdAt: '2025-08-21T14:30:00Z',
    updatedAt: '2025-08-21T14:30:00Z'
  },
  {
    _id: '3',
    id: '3',
    name: 'Mike Wilson',
    email: 'mike@wilson.com',
    mobile: '+1122334455',
    source: 'Cold Call',
    status: 'followup',
    createdBy: { _id: 'staff1', name: 'Alice Johnson', email: 'alice@company.com', role: 'staff' },
    createdAt: '2025-08-22T09:15:00Z',
    updatedAt: '2025-08-22T09:15:00Z'
  },
  {
    _id: '4',
    id: '4',
    name: 'Emma Davis',
    email: 'emma@global.com',
    mobile: '+1555666777',
    source: 'Website',
    status: 'details_sent',
    createdBy: { _id: 'staff2', name: 'Bob Smith', email: 'bob@company.com', role: 'staff' },
    createdAt: '2025-08-23T16:45:00Z',
    updatedAt: '2025-08-23T16:45:00Z'
  },
  {
    _id: '5',
    id: '5',
    name: 'Robert Brown',
    email: 'robert@brown.com',
    mobile: '+1888999000',
    source: 'Trade Show',
    status: 'deal_done',
    createdBy: { _id: 'staff1', name: 'Alice Johnson', email: 'alice@company.com', role: 'staff' },
    createdAt: '2025-08-19T11:20:00Z',
    updatedAt: '2025-08-24T15:30:00Z'
  }
];

const mockStaff: User[] = [
  {
    id: 'staff1',
    email: 'alice@company.com',
    password: '',
    name: 'Alice Johnson',
    role: 'staff',
    phone: '+1111111111',
    active: true,
    createdAt: '2025-08-01T10:00:00Z',
    updatedAt: '2025-08-01T10:00:00Z'
  },
  {
    id: 'staff2',
    email: 'bob@company.com',
    password: '',
    name: 'Bob Smith',
    role: 'staff',
    phone: '+2222222222',
    active: true,
    createdAt: '2025-08-01T10:00:00Z',
    updatedAt: '2025-08-01T10:00:00Z'
  }
];

const mockCalls: Call[] = [
  {
    id: '1',
    leadId: '1',
    staffId: 'staff1',
    datetime: '2025-08-25T10:00:00Z',
    durationSec: 1800,
    status: 'completed',
    notes: 'Initial discussion about requirements',
    nextActionDate: '2025-08-27T10:00:00Z',
    createdAt: '2025-08-25T10:00:00Z'
  },
  {
    id: '2',
    leadId: '2',
    staffId: 'staff1',
    datetime: '2025-08-26T14:00:00Z',
    durationSec: 900,
    status: 'completed',
    notes: 'Follow-up call to discuss pricing',
    createdAt: '2025-08-26T14:00:00Z'
  }
];

const mockMeetings: Meeting[] = [
  {
    id: '1',
    leadId: '3',
    staffId: 'staff2',
    datetime: '2025-08-29T10:00:00Z',
    locationType: 'onsite',
    location: 'Client office',
    notes: 'Product demonstration',
    status: 'scheduled',
    createdAt: '2025-08-22T09:15:00Z'
  }
];

const mockQuotations: Quotation[] = [
  {
    id: '1',
    leadId: '4',
    staffId: 'staff1',
    number: 'Q-2025-001',
    items: [
      {
        product: 'Premium Software License',
        quantity: 5,
        unitPrice: 1000,
        taxPct: 10
      }
    ],
    subtotal: '5000.00',
    taxTotal: '500.00',
    grandTotal: '5500.00',
    validityDate: '2025-09-25T00:00:00Z',
    status: 'sent',
    createdAt: '2025-08-23T16:45:00Z',
    updatedAt: '2025-08-23T16:45:00Z'
  }
];

const mockServiceRequests: ServiceRequest[] = [
  {
    _id: '1',
    id: '1',
    leadId: { _id: '5', name: 'Robert Brown', email: 'robert@brown.com' },
    technicianId: { _id: 'staff1', name: 'Alice Johnson', email: 'alice@company.com', role: 'staff' },
    issue: 'Machine not starting properly',
    priority: 'high',
    status: 'pending',
    createdBy: { _id: 'staff1', name: 'Alice Johnson', email: 'alice@company.com', role: 'staff' },
    createdAt: '2025-08-25T08:00:00Z',
    updatedAt: '2025-08-25T08:00:00Z'
  },
  {
    _id: '2',
    id: '2',
    leadId: { _id: '2', name: 'Sarah Johnson', email: 'sarah@abc.com' },
    technicianId: { _id: 'staff2', name: 'Bob Smith', email: 'bob@company.com', role: 'staff' },
    issue: 'Regular maintenance required',
    priority: 'medium',
    status: 'pending',
    createdBy: { _id: 'staff2', name: 'Bob Smith', email: 'bob@company.com', role: 'staff' },
    createdAt: '2025-08-24T15:30:00Z',
    updatedAt: '2025-08-26T09:00:00Z'
  }
];

// Mock hook functions
export function useLeads(staffId?: string) {
  const [data, setData] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call delay
    setTimeout(() => {
      const filteredLeads = staffId 
        ? mockLeads.filter(lead => lead.createdBy._id === staffId)
        : mockLeads;
      setData(filteredLeads);
      setIsLoading(false);
    }, 500);
  }, [staffId]);

  return { data, isLoading };
}

export function useLead(id: string) {
  const [data, setData] = useState<Lead | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    setTimeout(() => {
      const lead = mockLeads.find(l => l.id === id);
      setData(lead);
      setIsLoading(false);
    }, 300);
  }, [id]);

  return { data, isLoading };
}

export function useStaff() {
  const [data, setData] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setData(mockStaff);
      setIsLoading(false);
    }, 300);
  }, []);

  return { data, isLoading };
}

export function useCalls(leadId?: string, staffId?: string) {
  const [data, setData] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      let filteredCalls = mockCalls;
      if (leadId) filteredCalls = filteredCalls.filter(call => call.leadId === leadId);
      if (staffId) filteredCalls = filteredCalls.filter(call => call.staffId === staffId);
      setData(filteredCalls);
      setIsLoading(false);
    }, 300);
  }, [leadId, staffId]);

  return { data, isLoading };
}

export function useMeetings(staffId?: string) {
  const [data, setData] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      const filteredMeetings = staffId 
        ? mockMeetings.filter(meeting => meeting.staffId === staffId)
        : mockMeetings;
      setData(filteredMeetings);
      setIsLoading(false);
    }, 300);
  }, [staffId]);

  return { data, isLoading };
}

export function useQuotations(staffId?: string) {
  const [data, setData] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      const filteredQuotations = staffId 
        ? mockQuotations.filter(quotation => quotation.staffId === staffId)
        : mockQuotations;
      setData(filteredQuotations);
      setIsLoading(false);
    }, 300);
  }, [staffId]);

  return { data, isLoading };
}

export function useQuotation(id: string) {
  const [data, setData] = useState<Quotation | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    setTimeout(() => {
      const quotation = mockQuotations.find(q => q.id === id);
      setData(quotation);
      setIsLoading(false);
    }, 300);
  }, [id]);

  return { data, isLoading };
}

export function useServiceRequests() {
  const [data, setData] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setData(mockServiceRequests);
      setIsLoading(false);
    }, 300);
  }, []);

  return { data, isLoading };
}

export function useServiceRequest(id: string) {
  const [data, setData] = useState<ServiceRequest | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    setTimeout(() => {
      const request = mockServiceRequests.find(r => r.id === id);
      setData(request);
      setIsLoading(false);
    }, 300);
  }, [id]);

  return { data, isLoading };
}

// Mock mutation hooks that just return success functions
export function useCreateLead() {
  return {
    mutate: (data: any) => {
      console.log('Mock: Creating lead', data);
      // In a real app, this would trigger a success toast
    },
    isPending: false
  };
}

export function useUpdateLead() {
  return {
    mutate: ({ id, data }: { id: string; data: any }) => {
      console.log('Mock: Updating lead', id, data);
    },
    isPending: false
  };
}

export function useDeleteLead() {
  return {
    mutate: (id: string) => {
      console.log('Mock: Deleting lead', id);
    },
    isPending: false
  };
}

export function useAssignLead() {
  return {
    mutate: ({ id, staffId }: { id: string; staffId: string }) => {
      console.log('Mock: Assigning lead', id, 'to staff', staffId);
    },
    isPending: false
  };
}

export function useCreateCall() {
  return {
    mutate: (data: any) => {
      console.log('Mock: Creating call', data);
    },
    isPending: false
  };
}

export function useCreateMeeting() {
  return {
    mutate: (data: any) => {
      console.log('Mock: Creating meeting', data);
    },
    isPending: false
  };
}

export function useCreateQuotation() {
  return {
    mutate: (data: any) => {
      console.log('Mock: Creating quotation', data);
    },
    isPending: false
  };
}

export function useUpdateQuotation() {
  return {
    mutate: ({ id, data }: { id: string; data: any }) => {
      console.log('Mock: Updating quotation', id, data);
    },
    isPending: false
  };
}

export function useCreateServiceRequest() {
  return {
    mutate: (data: any) => {
      console.log('Mock: Creating service request', data);
    },
    isPending: false
  };
}

export function useStartServiceRequest() {
  return {
    mutate: (id: string) => {
      console.log('Mock: Starting service request', id);
    },
    isPending: false
  };
}

export function useResolveServiceRequest() {
  return {
    mutate: ({ id, resolutionNotes }: { id: string; resolutionNotes: string; photo?: File }) => {
      console.log('Mock: Resolving service request', id, resolutionNotes);
    },
    isPending: false
  };
}
