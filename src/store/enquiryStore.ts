import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  Enquiry,
  EnquiryCreateData,
  EnquiryUpdateData,
  EnquiryQueryParams,
  EnquiryListResponse,
  ConvertEnquiryToLeadData,
  createEnquiryApi,
  getEnquiriesApi,
  getEnquiryByIdApi,
  updateEnquiryApi,
  deleteEnquiryApi,
  convertEnquiryToLeadApi,
} from '../api/enquiryApi';

interface EnquiryStore {
  // State
  enquiries: Enquiry[];
  selectedEnquiry: Enquiry | null;
  pagination: EnquiryListResponse['pagination'] | null;
  loading: boolean;
  error: string | null;
  filters: EnquiryQueryParams;

  // Actions
  setEnquiries: (enquiries: Enquiry[]) => void;
  setSelectedEnquiry: (enquiry: Enquiry | null) => void;
  setPagination: (pagination: EnquiryListResponse['pagination']) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: EnquiryQueryParams) => void;
  clearError: () => void;

  // API Actions
  fetchEnquiries: (params?: EnquiryQueryParams) => Promise<void>;
  fetchEnquiryById: (enquiryId: string) => Promise<Enquiry | null>;
  createEnquiry: (enquiryData: EnquiryCreateData) => Promise<Enquiry | null>;
  updateEnquiry: (enquiryId: string, updateData: EnquiryUpdateData) => Promise<Enquiry | null>;
  deleteEnquiry: (enquiryId: string) => Promise<boolean>;
  convertEnquiryToLead: (enquiryId: string, convertData: ConvertEnquiryToLeadData) => Promise<any | null>;
  
  // Pagination Actions
  changePage: (page: number) => Promise<void>;
  changePageSize: (pageSize: number) => Promise<void>;
  
  // Utility Actions
  searchEnquiries: (query: string) => Enquiry[];
  refreshEnquiries: () => Promise<void>;
  resetStore: () => void;
}

const initialFilters: EnquiryQueryParams = {
  page: 1,
  limit: 10,
};

const initialState = {
  enquiries: [],
  selectedEnquiry: null,
  pagination: null,
  loading: false,
  error: null,
  filters: initialFilters,
};

export const useEnquiryStore = create<EnquiryStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Setters
      setEnquiries: (enquiries) => set({ enquiries }),
      setSelectedEnquiry: (enquiry) => set({ selectedEnquiry: enquiry }),
      setPagination: (pagination) => set({ pagination }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),
      clearError: () => set({ error: null }),

      // API Actions
      fetchEnquiries: async (params) => {
        set({ loading: true, error: null });
        try {
          const queryParams = { ...params };
          const response = await getEnquiriesApi(queryParams);
          
          set({
            enquiries: response.enquiries,
            pagination: response.pagination,
            filters: queryParams,
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch enquiries',
            loading: false,
          });
        }
      },

      fetchEnquiryById: async (enquiryId) => {
        set({ loading: true, error: null });
        try {
          const enquiry = await getEnquiryByIdApi(enquiryId);
          set({ selectedEnquiry: enquiry, loading: false });
          return enquiry;
        } catch (error) {
          console.error('Failed to fetch enquiry:', error);
          set({
            loading: false,
            selectedEnquiry: null,
          });
          return null;
        }
      },

      createEnquiry: async (enquiryData) => {
        set({ loading: true, error: null });
        try {
          const newEnquiry = await createEnquiryApi(enquiryData);
          
          // Add to enquiries list at the beginning
          const currentEnquiries = get().enquiries;
          set({
            enquiries: [newEnquiry, ...currentEnquiries],
            loading: false,
          });
          
          return newEnquiry;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create enquiry',
            loading: false,
          });
          return null;
        }
      },

      updateEnquiry: async (enquiryId, updateData) => {
        set({ loading: true, error: null });
        try {
          const updatedEnquiry = await updateEnquiryApi(enquiryId, updateData);
          
          const currentState = get();
          const currentEnquiries = currentState.enquiries;
          const updatedEnquiries = currentEnquiries.map((enquiry) =>
            enquiry._id === enquiryId ? updatedEnquiry : enquiry
          );
          
          const newSelectedEnquiry = currentState.selectedEnquiry?._id === enquiryId 
            ? updatedEnquiry 
            : currentState.selectedEnquiry;
          
          set({
            enquiries: updatedEnquiries,
            selectedEnquiry: newSelectedEnquiry,
            loading: false,
          });
          
          return updatedEnquiry;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update enquiry',
            loading: false,
          });
          return null;
        }
      },

      deleteEnquiry: async (enquiryId) => {
        set({ loading: true, error: null });
        try {
          await deleteEnquiryApi(enquiryId);
          
          // Remove from enquiries list
          const currentEnquiries = get().enquiries;
          const filteredEnquiries = currentEnquiries.filter((enquiry) => enquiry._id !== enquiryId);
          
          set({
            enquiries: filteredEnquiries,
            selectedEnquiry: get().selectedEnquiry?._id === enquiryId ? null : get().selectedEnquiry,
            loading: false,
          });
          
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete enquiry',
            loading: false,
          });
          return false;
        }
      },

      convertEnquiryToLead: async (enquiryId, convertData) => {
        set({ loading: true, error: null });
        try {
          const lead = await convertEnquiryToLeadApi(enquiryId, convertData);
          
          // Remove enquiry from list after conversion
          const currentEnquiries = get().enquiries;
          const filteredEnquiries = currentEnquiries.filter((enquiry) => enquiry._id !== enquiryId);
          
          set({
            enquiries: filteredEnquiries,
            selectedEnquiry: get().selectedEnquiry?._id === enquiryId ? null : get().selectedEnquiry,
            loading: false,
          });
          
          return lead;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to convert enquiry to lead',
            loading: false,
          });
          return null;
        }
      },

      // Pagination Actions
      changePage: async (page) => {
        const currentFilters = get().filters;
        await get().fetchEnquiries({ ...currentFilters, page });
      },

      changePageSize: async (pageSize) => {
        const currentFilters = get().filters;
        await get().fetchEnquiries({ ...currentFilters, limit: pageSize, page: 1 });
      },

      // Utility Actions
      searchEnquiries: (query) => {
        const enquiries = get().enquiries;
        const lowercaseQuery = query.toLowerCase();
        
        return enquiries.filter((enquiry) =>
          enquiry.customer.name.toLowerCase().includes(lowercaseQuery) ||
          enquiry.customer.email?.toLowerCase().includes(lowercaseQuery) ||
          enquiry.customer.mobile?.includes(query) ||
          enquiry.customer.address?.toLowerCase().includes(lowercaseQuery)
        );
      },

      refreshEnquiries: async () => {
        const filters = get().filters;
        await get().fetchEnquiries(filters);
      },

      resetStore: () => {
        set(initialState);
      },
    }),
    {
      name: 'enquiry-store',
    }
  )
);

