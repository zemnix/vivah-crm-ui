import React from 'react';
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import {
  Business,
  BusinessCreateData,
  BusinessUpdateData,
  createBusinessApi,
  getBusinessApi,
  updateBusinessApi,
  deleteBusinessApi,
} from '../api/businessApi';

interface BusinessState {
  // State
  business: Business | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null; // Timestamp for cache management
  isCached: boolean; // Flag to track if data is cached
  
  // Actions
  setBusiness: (business: Business | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // API Actions
  fetchBusiness: (forceRefresh?: boolean) => Promise<Business | null>;
  createBusiness: (businessData: BusinessCreateData) => Promise<Business | null>;
  updateBusiness: (businessData: BusinessUpdateData) => Promise<Business | null>;
  deleteBusiness: () => Promise<boolean>;
  
  // Cache Management
  invalidateCache: () => void;
  isCacheValid: () => boolean;
  refreshBusiness: () => Promise<Business | null>;
  
  // Utility Actions
  resetStore: () => void;
}

const initialState = {
  business: null,
  isLoading: false,
  error: null,
  lastFetched: null,
  isCached: false,
};

// Cache duration: 24 hours (since business data rarely changes)
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const useBusinessStore = create<BusinessState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Setters
        setBusiness: (business) => set({ 
          business, 
          lastFetched: business ? Date.now() : null,
          isCached: !!business 
        }),
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),

        // Cache Management
        invalidateCache: () => set({ 
          lastFetched: null, 
          isCached: false 
        }),
        
        isCacheValid: () => {
          const state = get();
          if (!state.lastFetched || !state.business) {
            return false;
          }
          const now = Date.now();
          return (now - state.lastFetched) < CACHE_DURATION;
        },

        // API Actions
        fetchBusiness: async (forceRefresh = false) => {
          const state = get();
          
          // Return cached data if valid and not forcing refresh
          if (!forceRefresh && state.business && state.isCacheValid()) {
            console.log('Returning cached business data');
            // return state.business;
          }

          set({ isLoading: true, error: null });
          
          try {
            console.log('Fetching fresh business data from API');
            const business = await getBusinessApi();
            
            set({
              business,
              isLoading: false,
              lastFetched: Date.now(),
              isCached: true,
              error: null,
            });
            
            return business;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch business profile';
            
            set({
              error: errorMessage,
              isLoading: false,
              // Don't clear business data on error if we have cached data
              business: state.business,
            });
            
            // Return cached data if available, even on error
            return state.business;
          }
        },

        createBusiness: async (businessData) => {
          set({ isLoading: true, error: null });
          
          try {
            const business = await createBusinessApi(businessData);
            
            set({
              business,
              isLoading: false,
              lastFetched: Date.now(),
              isCached: true,
              error: null,
            });
            
            return business;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create business profile';
            
            set({
              error: errorMessage,
              isLoading: false,
            });
            
            return null;
          }
        },

        updateBusiness: async (businessData) => {
          const state = get();
          set({ isLoading: true, error: null });
          
          try {
            const updatedBusiness = await updateBusinessApi(businessData);
            
            set({
              business: updatedBusiness,
              isLoading: false,
              lastFetched: Date.now(),
              isCached: true,
              error: null,
            });
            
            return updatedBusiness;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update business profile';
            
            set({
              error: errorMessage,
              isLoading: false,
              // Keep existing business data on error
              business: state.business,
            });
            
            return null;
          }
        },

        deleteBusiness: async () => {
          set({ isLoading: true, error: null });
          
          try {
            await deleteBusinessApi();
            
            set({
              business: null,
              isLoading: false,
              lastFetched: null,
              isCached: false,
              error: null,
            });
            
            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete business profile';
            
            set({
              error: errorMessage,
              isLoading: false,
            });
            
            return false;
          }
        },

        refreshBusiness: async () => {
          return get().fetchBusiness(true);
        },

        resetStore: () => {
          set(initialState);
        },
      }),
      {
        name: 'business-storage',
        // Only persist the business data, cache metadata, and timestamps
        partialize: (state) => ({
          business: state.business,
          lastFetched: state.lastFetched,
          isCached: state.isCached,
        }),
        // Custom storage to handle cache expiration on rehydration
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Check if cache is expired on app startup
            const now = Date.now();
            if (state.lastFetched && (now - state.lastFetched) > CACHE_DURATION) {
              console.log('Business cache expired on rehydration, invalidating...');
              state.business = null;
              state.lastFetched = null;
              state.isCached = false;
            }
          }
        },
      }
    ),
    {
      name: 'business-store',
    }
  )
);

// Export a hook for easy access to business data with automatic fetching
export const useBusinessData = () => {
  const store = useBusinessStore();
  
  // Auto-fetch on first use if not cached
  React.useEffect(() => {
    if (!store.business && !store.isLoading && !store.isCached) {
      store.fetchBusiness();
    }
  }, [store.business, store.isLoading, store.isCached, store.fetchBusiness]);
  
  return {
    business: store.business,
    isLoading: store.isLoading,
    error: store.error,
    refetch: store.refreshBusiness,
  };
};
