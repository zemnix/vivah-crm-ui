import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  Quotation,
  QuotationCreateData,
  QuotationUpdateData,
  QuotationQueryParams,
  QuotationListResponse,
  QuotationStatus,
  createQuotationApi,
  getQuotationsApi,
  getQuotationByIdApi,
  updateQuotationApi,
  deleteQuotationApi,
} from '../api/quotationApi';
import ReactPDFService, { ReactPDFOptions } from '../services/reactPdfService';

interface QuotationStore {
  // State
  quotations: Quotation[];
  selectedQuotation: Quotation | null;
  pagination: QuotationListResponse['pagination'] | null;
  loading: boolean;
  error: string | null;
  filters: QuotationQueryParams;
  pdfGenerating: boolean;

  // Actions
  setQuotations: (quotations: Quotation[]) => void;
  setSelectedQuotation: (quotation: Quotation | null) => void;
  setPagination: (pagination: QuotationListResponse['pagination']) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: QuotationQueryParams) => void;
  setPdfGenerating: (generating: boolean) => void;
  clearError: () => void;

  // API Actions
  fetchQuotations: (params?: QuotationQueryParams) => Promise<void>;
  fetchQuotationById: (quotationId: string) => Promise<Quotation | null>;
  createQuotation: (quotationData: QuotationCreateData) => Promise<Quotation | null>;
  updateQuotation: (quotationId: string, updateData: QuotationUpdateData) => Promise<Quotation | null>;
  deleteQuotation: (quotationId: string) => Promise<boolean>;
  
  // PDF Actions
  downloadQuotationPDF: (quotation: Quotation, options?: ReactPDFOptions) => Promise<boolean>;
  previewQuotationPDF: (quotation: Quotation) => Promise<string | null>;
  
  // Pagination Actions
  changePage: (page: number) => Promise<void>;
  changePageSize: (pageSize: number) => Promise<void>;
  
  // Utility Actions
  getQuotationsByStatus: (status: QuotationStatus) => Quotation[];
  getQuotationsByLead: (leadId: string) => Quotation[];
  getQuotationsByStaff: (staffId: string) => Quotation[];
  searchQuotations: (query: string) => Quotation[];
  refreshQuotations: () => Promise<void>;
  resetStore: () => void;
}

const initialFilters: QuotationQueryParams = {
  page: 1,
  limit: 10,
};

const initialState = {
  quotations: [],
  selectedQuotation: null,
  pagination: null,
  loading: false,
  error: null,
  filters: initialFilters,
  pdfGenerating: false,
};

export const useQuotationStore = create<QuotationStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Setters
      setQuotations: (quotations) => set({ quotations }),
      setSelectedQuotation: (quotation) => set({ selectedQuotation: quotation }),
      setPagination: (pagination) => set({ pagination }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),
      setPdfGenerating: (generating) => set({ pdfGenerating: generating }),
      clearError: () => set({ error: null }),

      // API Actions
      fetchQuotations: async (params) => {
        const currentState = get();
        set({ loading: true, error: null });
        try {
          const queryParams = { ...currentState.filters, ...params };
          
          // Convert array status to comma-separated string for API
          if (queryParams.status && Array.isArray(queryParams.status)) {
            queryParams.status = queryParams.status.join(',') as any;
          }
          
          const response = await getQuotationsApi(queryParams);
          
          set({
            quotations: response.quotations,
            pagination: response.pagination,
            filters: queryParams,
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch quotations',
            loading: false,
          });
        }
      },

      fetchQuotationById: async (quotationId) => {
        set({ loading: true, error: null });
        try {
          const quotation = await getQuotationByIdApi(quotationId);
          set({ selectedQuotation: quotation, loading: false });
          return quotation;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch quotation',
            loading: false,
            selectedQuotation: null,
          });
          return null;
        }
      },

      createQuotation: async (quotationData) => {
        set({ loading: true, error: null });
        try {
          const newQuotation = await createQuotationApi(quotationData);
          
          // Add to quotations list at the beginning
          const currentQuotations = get().quotations;
          set({
            quotations: [newQuotation, ...currentQuotations],
            loading: false,
          });
          
          return newQuotation;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create quotation',
            loading: false,
          });
          return null;
        }
      },

      updateQuotation: async (quotationId, updateData, optimistic = false) => {
        // Only set loading if not optimistic update
        if (!optimistic) {
          set({ loading: true, error: null });
        }
        
        try {
          const updatedQuotation = await updateQuotationApi(quotationId, updateData);
          
          // Use optimized state update
          const currentState = get();
          const currentQuotations = currentState.quotations;
          const updatedQuotations = currentQuotations.map((quotation) =>
            quotation._id === quotationId ? updatedQuotation : quotation
          );
          
          // Only update selectedQuotation if it's the one being updated
          const newSelectedQuotation = currentState.selectedQuotation?._id === quotationId 
            ? updatedQuotation 
            : currentState.selectedQuotation;
          
          // Batch the state updates
          set({
            quotations: updatedQuotations,
            selectedQuotation: newSelectedQuotation,
            loading: false,
          });
          
          return updatedQuotation;
        } catch (error) {
          // Don't set error in store for status transition errors - let the component handle it
          const errorMessage = error instanceof Error ? error.message : 'Failed to update quotation';
          
          // Only set error in store if it's not a status transition error
          if (!errorMessage.includes('Invalid status transition')) {
            set({
              error: errorMessage,
              loading: false,
            });
          } else {
            set({ loading: false });
          }
          
          // Throw the error so the component can handle it
          throw error;
        }
      },

      deleteQuotation: async (quotationId) => {
        set({ loading: true, error: null });
        try {
          await deleteQuotationApi(quotationId);
          
          // Remove from quotations list
          const currentQuotations = get().quotations;
          const filteredQuotations = currentQuotations.filter((quotation) => quotation._id !== quotationId);
          
          set({
            quotations: filteredQuotations,
            selectedQuotation: get().selectedQuotation?._id === quotationId ? null : get().selectedQuotation,
            loading: false,
          });
          
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete quotation',
            loading: false,
          });
          return false;
        }
      },

      // PDF Actions
      downloadQuotationPDF: async (quotation, options) => {
        set({ pdfGenerating: true, error: null });
        try {
          await ReactPDFService.downloadQuotationPDF(quotation, undefined, options);
          set({ pdfGenerating: false });
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to generate PDF',
            pdfGenerating: false,
          });
          return false;
        }
      },

      previewQuotationPDF: async (quotation) => {
        set({ pdfGenerating: true, error: null });
        try {
          const previewUrl = await ReactPDFService.previewQuotationPDF(quotation);
          set({ pdfGenerating: false });
          return previewUrl;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to generate PDF preview',
            pdfGenerating: false,
          });
          return null;
        }
      },

      // Pagination Actions
      changePage: async (page) => {
        const currentFilters = get().filters;
        await get().fetchQuotations({ ...currentFilters, page });
      },

      changePageSize: async (pageSize) => {
        const currentFilters = get().filters;
        await get().fetchQuotations({ ...currentFilters, limit: pageSize, page: 1 });
      },

      // Utility Actions
      getQuotationsByStatus: (status) => {
        return get().quotations.filter((quotation) => quotation.status === status);
      },

      getQuotationsByLead: (leadId) => {
        return get().quotations.filter((quotation) => quotation.leadId._id === leadId);
      },

      getQuotationsByStaff: (staffId) => {
        return get().quotations.filter((quotation) => quotation.staffId._id === staffId);
      },

      searchQuotations: (query) => {
        const quotations = get().quotations;
        const lowercaseQuery = query.toLowerCase();
        
        return quotations.filter((quotation) =>
          quotation.quotationNo.toLowerCase().includes(lowercaseQuery) ||
          quotation.leadId.name.toLowerCase().includes(lowercaseQuery) ||
          quotation.leadId.email?.toLowerCase().includes(lowercaseQuery) ||
          quotation.customer.name.toLowerCase().includes(lowercaseQuery) ||
          quotation.customer.email?.toLowerCase().includes(lowercaseQuery) ||
          quotation.customer.mobile?.includes(query) ||
          quotation.notes?.toLowerCase().includes(lowercaseQuery)
        );
      },

      refreshQuotations: async () => {
        const filters = get().filters;
        await get().fetchQuotations(filters);
      },

      resetStore: () => {
        set(initialState);
      },
    }),
    {
      name: 'quotation-store',
    }
  )
);