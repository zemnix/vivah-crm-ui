import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ServiceRequest,
  ServiceRequestCreateData,
  ServiceRequestUpdateData,
  FCSRUpdateData,
  ServiceRequestQueryParams,
  ServiceRequestSearchParams,
  ServiceRequestStats,
  ServiceRequestResponse,
  ServiceRequestSearchResponse,
  createServiceRequestApi,
  getServiceRequestsApi,
  getServiceRequestByIdApi,
  updateServiceRequestApi,
  updateFCSRFieldsApi,
  checkICSRPDFExistsApi,
  updateICSRURLApi,
  checkFCSRPDFExistsApi,
  updateFCSRURLApi,
  deleteServiceRequestApi,
  searchServiceRequestsApi,
  getServiceRequestStatsApi,
} from '@/api/serviceRequestApi';

interface ServiceRequestState {
  // Data
  serviceRequests: ServiceRequest[];
  selectedServiceRequest: ServiceRequest | null;
  stats: ServiceRequestStats | null;
  searchResults: ServiceRequest[];
  
  // Pagination
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  } | null;
  
  // UI State
  loading: boolean;
  error: string | null;
  isBackgroundSaving: boolean;
  
  // Cache
  lastFetchTime: number | null;
  cacheExpiry: number; // 5 minutes
  
  // Actions
  setServiceRequests: (serviceRequests: ServiceRequest[]) => void;
  setSelectedServiceRequest: (serviceRequest: ServiceRequest | null) => void;
  setStats: (stats: ServiceRequestStats | null) => void;
  setSearchResults: (results: ServiceRequest[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsBackgroundSaving: (saving: boolean) => void;
  
  // CRUD Operations
  createServiceRequest: (data: ServiceRequestCreateData) => Promise<ServiceRequest>;
  getServiceRequests: (params?: ServiceRequestQueryParams) => Promise<ServiceRequestResponse>;
  getServiceRequestById: (id: string) => Promise<ServiceRequest>;
  updateServiceRequest: (id: string, data: ServiceRequestUpdateData, optimistic?: boolean) => Promise<ServiceRequest>;
  updateFCSRFields: (id: string, data: FCSRUpdateData) => Promise<ServiceRequest>;
  checkICSRPDFExists: (id: string) => Promise<{ pdfUrl: string | null; exists: boolean }>;
  updateICSRURL: (id: string, pdfUrl: string) => Promise<ServiceRequest>;
  checkFCSRPDFExists: (id: string) => Promise<{ pdfUrl: string | null; exists: boolean }>;
  updateFCSRURL: (id: string, pdfUrl: string) => Promise<ServiceRequest>;
  deleteServiceRequest: (id: string) => Promise<{ message: string }>;
  searchServiceRequests: (params: ServiceRequestSearchParams) => Promise<ServiceRequestSearchResponse>;
  getServiceRequestStats: () => Promise<ServiceRequestStats>;
  
  // Utility Actions
  clearError: () => void;
  clearCache: () => void;
  isCacheValid: () => boolean;
}

export const useServiceRequestStore = create<ServiceRequestState>()(
  persist(
    (set, get) => ({
      // Initial State
      serviceRequests: [],
      selectedServiceRequest: null,
      stats: null,
      searchResults: [],
      pagination: null,
      loading: false,
      error: null,
      isBackgroundSaving: false,
      lastFetchTime: null,
      cacheExpiry: 5 * 60 * 1000, // 5 minutes

      // Setters
      setServiceRequests: (serviceRequests) => set({ serviceRequests }),
      setSelectedServiceRequest: (serviceRequest) => set({ selectedServiceRequest: serviceRequest }),
      setStats: (stats) => set({ stats }),
      setSearchResults: (results) => set({ searchResults: results }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setIsBackgroundSaving: (saving) => set({ isBackgroundSaving: saving }),

      // CRUD Operations
      createServiceRequest: async (data) => {
        set({ loading: true, error: null });
        try {
          const serviceRequest = await createServiceRequestApi(data);
          set((state) => ({
            serviceRequests: [serviceRequest, ...state.serviceRequests],
            loading: false,
            lastFetchTime: Date.now(),
          }));
          return serviceRequest;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create service request';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      getServiceRequests: async (params) => {
        const { isCacheValid, lastFetchTime } = get();
        
        // Use cache if valid and no specific params
        if (isCacheValid() && !params && lastFetchTime) {
          return {
            serviceRequests: get().serviceRequests,
            pagination: get().pagination || {
              currentPage: 1,
              totalPages: 1,
              totalItems: get().serviceRequests.length,
              itemsPerPage: 10,
            },
          };
        }

        set({ loading: true, error: null });
        try {
          const response = await getServiceRequestsApi(params);
          set({
            serviceRequests: response.serviceRequests,
            pagination: response.pagination,
            loading: false,
            lastFetchTime: Date.now(),
          });
          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch service requests';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      getServiceRequestById: async (id) => {
        set({ loading: true, error: null });
        try {
          const serviceRequest = await getServiceRequestByIdApi(id);
          set({ selectedServiceRequest: serviceRequest, loading: false });
          return serviceRequest;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch service request';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      updateServiceRequest: async (id, data, optimistic = false) => {
        if (optimistic) {
          // Optimistic update
          const currentServiceRequest = get().selectedServiceRequest;
          if (currentServiceRequest && currentServiceRequest._id === id) {
            const optimisticServiceRequest = { ...currentServiceRequest, ...data } as ServiceRequest;
            set({ selectedServiceRequest: optimisticServiceRequest });
          }
          
          // Update in list
          set((state) => ({
            serviceRequests: state.serviceRequests.map((sr) =>
              sr._id === id ? { ...sr, ...data } as ServiceRequest : sr
            ),
          }));
        }

        set({ loading: !optimistic, error: null });
        try {
          const serviceRequest = await updateServiceRequestApi(id, data);
          
          // Update state with actual response
          set((state) => ({
            serviceRequests: state.serviceRequests.map((sr) =>
              sr._id === id ? serviceRequest : sr
            ),
            selectedServiceRequest: state.selectedServiceRequest?._id === id ? serviceRequest : state.selectedServiceRequest,
            loading: false,
            lastFetchTime: Date.now(),
          }));
          
          return serviceRequest;
        } catch (error) {
          // Rollback optimistic update on error
          if (optimistic) {
            set((state) => ({
              serviceRequests: state.serviceRequests.map((sr) =>
                sr._id === id ? (state.selectedServiceRequest || sr) : sr
              ),
            }));
          }
          
          const errorMessage = error instanceof Error ? error.message : 'Failed to update service request';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      updateFCSRFields: async (id, data) => {
        set({ loading: true, error: null });
        try {
          const updatedServiceRequest = await updateFCSRFieldsApi(id, data);
          
          set((state) => ({
            serviceRequests: state.serviceRequests.map((sr) =>
              sr._id === id ? updatedServiceRequest : sr
            ),
            selectedServiceRequest: state.selectedServiceRequest?._id === id 
              ? updatedServiceRequest 
              : state.selectedServiceRequest,
            loading: false,
            lastFetchTime: Date.now(),
          }));
          
          return updatedServiceRequest;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update FCSR fields';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      checkICSRPDFExists: async (id) => {
        set({ loading: true, error: null });
        try {
          const result = await checkICSRPDFExistsApi(id);
          set({ loading: false, lastFetchTime: Date.now() });
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to check ICSR PDF status';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

    updateICSRURL: async (id, pdfUrl) => {
      set({ loading: true, error: null });
      try {
        const updatedServiceRequest = await updateICSRURLApi(id, pdfUrl);
        
        set((state) => ({
          serviceRequests: state.serviceRequests.map((sr) =>
            sr._id === id ? updatedServiceRequest : sr
          ),
          selectedServiceRequest: state.selectedServiceRequest?._id === id 
            ? updatedServiceRequest 
            : state.selectedServiceRequest,
          loading: false,
          lastFetchTime: Date.now(),
        }));
        
        return updatedServiceRequest;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update ICSR URL';
        set({ error: errorMessage, loading: false });
        throw error;
      }
    },

    checkFCSRPDFExists: async (id) => {
      set({ loading: true, error: null });
      try {
        const result = await checkFCSRPDFExistsApi(id);
        set({ loading: false, lastFetchTime: Date.now() });
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to check FCSR PDF status';
        set({ error: errorMessage, loading: false });
        throw error;
      }
    },

    updateFCSRURL: async (id, pdfUrl) => {
      set({ loading: true, error: null });
      try {
        const updatedServiceRequest = await updateFCSRURLApi(id, pdfUrl);
        
        set((state) => ({
          serviceRequests: state.serviceRequests.map((sr) =>
            sr._id === id ? updatedServiceRequest : sr
          ),
          selectedServiceRequest: state.selectedServiceRequest?._id === id 
            ? updatedServiceRequest 
            : state.selectedServiceRequest,
          loading: false,
          lastFetchTime: Date.now(),
        }));
        
        return updatedServiceRequest;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update FCSR URL';
        set({ error: errorMessage, loading: false });
        throw error;
      }
    },

      deleteServiceRequest: async (id) => {
        set({ loading: true, error: null });
        try {
          const result = await deleteServiceRequestApi(id);
          set((state) => ({
            serviceRequests: state.serviceRequests.filter((sr) => sr._id !== id),
            selectedServiceRequest: state.selectedServiceRequest?._id === id ? null : state.selectedServiceRequest,
            loading: false,
            lastFetchTime: Date.now(),
          }));
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete service request';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      searchServiceRequests: async (params) => {
        set({ loading: true, error: null });
        try {
          const response = await searchServiceRequestsApi(params);
          set({
            searchResults: response.serviceRequests,
            loading: false,
          });
          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to search service requests';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      getServiceRequestStats: async () => {
        set({ loading: true, error: null });
        try {
          const stats = await getServiceRequestStatsApi();
          set({ stats, loading: false });
          return stats;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch service request statistics';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      // Utility Actions
      clearError: () => set({ error: null }),
      clearCache: () => set({ lastFetchTime: null, serviceRequests: [], stats: null }),
      isCacheValid: () => {
        const { lastFetchTime, cacheExpiry } = get();
        return lastFetchTime ? Date.now() - lastFetchTime < cacheExpiry : false;
      },
    }),
    {
      name: 'service-request-store',
      partialize: (state) => ({
        serviceRequests: state.serviceRequests,
        selectedServiceRequest: state.selectedServiceRequest,
        stats: state.stats,
        lastFetchTime: state.lastFetchTime,
      }),
    }
  )
);
