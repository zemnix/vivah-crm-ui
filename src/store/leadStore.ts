import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  Lead,
  LeadCreateData,
  LeadUpdateData,
  LeadQueryParams,
  LeadListResponse,
  LeadStatsResponse,
  LeadStatus,
  createLeadApi,
  getLeadsApi,
  getLeadByIdApi,
  updateLeadApi,
  deleteLeadApi,
  assignLeadApi,
  getLeadStatsApi,
} from '../api/leadApi';

interface LeadStore {
  // State
  leads: Lead[];
  selectedLead: Lead | null;
  stats: LeadStatsResponse | null;
  pagination: LeadListResponse['pagination'] | null;
  loading: boolean;
  error: string | null;
  filters: LeadQueryParams;

  // Actions
  setLeads: (leads: Lead[]) => void;
  setSelectedLead: (lead: Lead | null) => void;
  setStats: (stats: LeadStatsResponse) => void;
  setPagination: (pagination: LeadListResponse['pagination']) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: LeadQueryParams) => void;
  clearError: () => void;

  // API Actions
  fetchLeads: (params?: LeadQueryParams) => Promise<void>;
  fetchLeadById: (leadId: string) => Promise<Lead | null>;
  createLead: (leadData: LeadCreateData) => Promise<Lead | null>;
  updateLead: (leadId: string, updateData: LeadUpdateData) => Promise<Lead | null>;
  updateLeadStatus: (leadId: string, status: LeadStatus) => Promise<Lead | null>;
  updateLeadStatusOptimistic: (leadId: string, status: LeadStatus) => Promise<{ success: boolean; error?: string }>;
  deleteLead: (leadId: string) => Promise<boolean>;
  assignLead: (leadId: string, staffId: string | null) => Promise<Lead | null>;
  fetchStats: () => Promise<void>;
  
  // Pagination Actions
  changePage: (page: number) => Promise<void>;
  changePageSize: (pageSize: number) => Promise<void>;
  
  // Utility Actions
  getLeadsByStatus: (status: LeadStatus) => Lead[];
  getAssignedLeads: (staffId: string) => Lead[];
  searchLeads: (query: string) => Lead[];
  refreshLeads: () => Promise<void>;
  resetStore: () => void;
}

const initialFilters: LeadQueryParams = {
  page: 1,
  limit: 10,
};

const initialState = {
  leads: [],
  selectedLead: null,
  stats: null,
  pagination: null,
  loading: false,
  error: null,
  filters: initialFilters,
};

export const useLeadStore = create<LeadStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Setters
      setLeads: (leads) => set({ leads }),
      setSelectedLead: (lead) => set({ selectedLead: lead }),
      setStats: (stats) => set({ stats }),
      setPagination: (pagination) => set({ pagination }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),
      clearError: () => set({ error: null }),

      // API Actions
      fetchLeads: async (params) => {
        set({ loading: true, error: null });
        try {
          const queryParams = { ...params };
          const response = await getLeadsApi(queryParams);
          
          set({
            leads: response.leads,
            pagination: response.pagination,
            filters: queryParams,
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch leads',
            loading: false,
          });
        }
      },

      fetchLeadById: async (leadId) => {
        set({ loading: true, error: null });
        try {
          const lead = await getLeadByIdApi(leadId);
          set({ selectedLead: lead, loading: false });
          return lead;
        } catch (error) {
          // Don't set global error for lead not found or access issues
          // Let the component handle it locally
          console.error('Failed to fetch lead:', error);
          set({
            loading: false,
            selectedLead: null,
          });
          return null;
        }
      },

      createLead: async (leadData) => {
        set({ loading: true, error: null });
        try {
          const newLead = await createLeadApi(leadData);
          
          // Add to leads list at the beginning
          const currentLeads = get().leads;
          set({
            leads: [newLead, ...currentLeads],
            loading: false,
          });
          
          return newLead;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create lead',
            loading: false,
          });
          return null;
        }
      },

      updateLead: async (leadId, updateData) => {
        set({ loading: true, error: null });
        try {
          const updatedLead = await updateLeadApi(leadId, updateData);
          
          // Use a more optimized state update to prevent glitches
          const currentState = get();
          const currentLeads = currentState.leads;
          const updatedLeads = currentLeads.map((lead) =>
            lead._id === leadId ? updatedLead : lead
          );
          
          // Only update selectedLead if it's the one being updated
          const newSelectedLead = currentState.selectedLead?._id === leadId 
            ? updatedLead 
            : currentState.selectedLead;
          
          // Batch the state updates to prevent multiple re-renders
          set({
            leads: updatedLeads,
            selectedLead: newSelectedLead,
            loading: false,
          });
          
          return updatedLead;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update lead',
            loading: false,
          });
          return null;
        }
      },

      updateLeadStatus: async (leadId, status) => {
        set({ loading: true, error: null });
        try {
          const updatedLead = await updateLeadApi(leadId, { status });
          
          // Use a more optimized state update to prevent glitches
          const currentState = get();
          const currentLeads = currentState.leads;
          const updatedLeads = currentLeads.map((lead) =>
            lead._id === leadId ? updatedLead : lead
          );
          
          // Only update selectedLead if it's the one being updated
          const newSelectedLead = currentState.selectedLead?._id === leadId 
            ? updatedLead 
            : currentState.selectedLead;
          
          // Batch the state updates to prevent multiple re-renders
          set({
            leads: updatedLeads,
            selectedLead: newSelectedLead,
            loading: false,
          });
          
          return updatedLead;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update lead status',
            loading: false,
          });
          return null;
        }
      },

      updateLeadStatusOptimistic: async (leadId, status) => {
        const currentState = get();
        const lead = currentState.leads.find(l => l._id === leadId);
        
        if (!lead) {
          return { success: false, error: 'Lead not found' };
        }

        // Store original status for rollback
        const originalStatus = lead.status;

        // Optimistically update the UI immediately (no loading state)
        const updatedLeads = currentState.leads.map((l) =>
          l._id === leadId ? { ...l, status } : l
        );

        const currentSelected = currentState.selectedLead;
        const newSelectedLead = currentSelected && currentSelected._id === leadId 
          ? ({ ...currentSelected, status } as Lead)
          : currentSelected;

        // Update UI immediately without setting loading: true
        set({
          leads: updatedLeads,
          selectedLead: newSelectedLead,
          error: null,
        });

        try {
          // Make API call in background
          await updateLeadApi(leadId, { status });
          return { success: true };
        } catch (err) {
          // Rollback on error
          const rollbackLeads = get().leads.map((l) =>
            l._id === leadId ? { ...l, status: originalStatus } : l
          );

          const selected = get().selectedLead;
          const rollbackSelectedLead = selected && selected._id === leadId 
            ? ({ ...selected, status: originalStatus } as Lead)
            : selected;

          // Don't set global error state for validation errors - let component handle them
          set({
            leads: rollbackLeads,
            selectedLead: rollbackSelectedLead,
          });
          
          const message = err instanceof Error ? err.message : 'Failed to update lead status';
          return { success: false, error: message };
        }
      },

      deleteLead: async (leadId) => {
        set({ loading: true, error: null });
        try {
          await deleteLeadApi(leadId);
          
          // Remove from leads list
          const currentLeads = get().leads;
          const filteredLeads = currentLeads.filter((lead) => lead._id !== leadId);
          
          set({
            leads: filteredLeads,
            selectedLead: get().selectedLead?._id === leadId ? null : get().selectedLead,
            loading: false,
          });
          
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete lead',
            loading: false,
          });
          return false;
        }
      },

      assignLead: async (leadId, staffId) => {
        set({ loading: true, error: null });
        try {
          const updatedLead = await assignLeadApi(leadId, staffId);
          
          // Update in leads list
          const currentLeads = get().leads;
          const updatedLeads = currentLeads.map((lead) => 
            lead._id === leadId ? updatedLead : lead
          );
          
          set({
            leads: updatedLeads,
            selectedLead: get().selectedLead?._id === leadId ? updatedLead : get().selectedLead,
            loading: false,
          });
          
          return updatedLead;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to assign lead',
            loading: false,
          });
          return null;
        }
      },

      fetchStats: async () => {
        set({ loading: true, error: null });
        try {
          const stats = await getLeadStatsApi();
          set({ stats, loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch stats',
            loading: false,
          });
        }
      },

      // Pagination Actions
      changePage: async (page) => {
        const currentFilters = get().filters;
        await get().fetchLeads({ ...currentFilters, page });
      },

      changePageSize: async (pageSize) => {
        const currentFilters = get().filters;
        await get().fetchLeads({ ...currentFilters, limit: pageSize, page: 1 });
      },

      // Utility Actions
      getLeadsByStatus: (status) => {
        return get().leads.filter((lead) => lead.status === status);
      },

      getAssignedLeads: (staffId) => {
        return get().leads.filter((lead) => lead.assignedTo?._id === staffId);
      },

      searchLeads: (query) => {
        const leads = get().leads;
        const lowercaseQuery = query.toLowerCase();
        
        return leads.filter((lead) =>
          lead.name.toLowerCase().includes(lowercaseQuery) ||
          lead.email?.toLowerCase().includes(lowercaseQuery) ||
          lead.mobile?.includes(query) ||
          lead.location?.toLowerCase().includes(lowercaseQuery) ||
          lead.machineName?.toLowerCase().includes(lowercaseQuery)
        );
      },

      refreshLeads: async () => {
        const filters = get().filters;
        await get().fetchLeads(filters);
      },

      resetStore: () => {
        set(initialState);
      },
    }),
    {
      name: 'lead-store',
    }
  )
);