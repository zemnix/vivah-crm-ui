import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  WorkEntry,
  WorkEntryCreateData,
  WorkEntryUpdateData,
  WorkEntryQueryParams,
  WorkEntryListResponse,
  WorkEntryStatsResponse,
  createWorkEntryApi,
  getWorkEntriesApi,
  getWorkEntryByIdApi,
  updateWorkEntryApi,
  deleteWorkEntryApi,
  getWorkEntryStatsApi,
} from '../api/workEntryApi';

interface WorkEntryStore {
  // State
  workEntries: WorkEntry[];
  selectedWorkEntry: WorkEntry | null;
  stats: WorkEntryStatsResponse | null;
  pagination: WorkEntryListResponse['pagination'] | null;
  loading: boolean;
  error: string | null;
  filters: WorkEntryQueryParams;

  // Actions
  setWorkEntries: (workEntries: WorkEntry[]) => void;
  setSelectedWorkEntry: (workEntry: WorkEntry | null) => void;
  setStats: (stats: WorkEntryStatsResponse) => void;
  setPagination: (pagination: WorkEntryListResponse['pagination']) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: WorkEntryQueryParams) => void;
  clearError: () => void;

  // API Actions
  fetchWorkEntries: (params?: WorkEntryQueryParams) => Promise<void>;
  fetchWorkEntryById: (entryId: string) => Promise<WorkEntry | null>;
  createWorkEntry: (entryData: WorkEntryCreateData) => Promise<WorkEntry | null>;
  updateWorkEntry: (entryId: string, updateData: WorkEntryUpdateData) => Promise<WorkEntry | null>;
  deleteWorkEntry: (entryId: string) => Promise<boolean>;
  fetchStats: () => Promise<void>;
  
  // Pagination Actions
  changePage: (page: number) => Promise<void>;
  changePageSize: (pageSize: number) => Promise<void>;
  
  // Utility Actions
  refreshWorkEntries: () => Promise<void>;
  resetStore: () => void;
}

const initialFilters: WorkEntryQueryParams = {
  page: 1,
  limit: 10,
};

const initialState = {
  workEntries: [],
  selectedWorkEntry: null,
  stats: null,
  pagination: null,
  loading: false,
  error: null,
  filters: initialFilters,
};

export const useWorkEntryStore = create<WorkEntryStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Setters
      setWorkEntries: (workEntries) => set({ workEntries }),
      setSelectedWorkEntry: (workEntry) => set({ selectedWorkEntry: workEntry }),
      setStats: (stats) => set({ stats }),
      setPagination: (pagination) => set({ pagination }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),
      clearError: () => set({ error: null }),

      // API Actions
      fetchWorkEntries: async (params) => {
        set({ loading: true, error: null });
        try {
          const queryParams = { ...get().filters, ...params };
          const response = await getWorkEntriesApi(queryParams);
          
          set({
            workEntries: response.workEntries,
            pagination: response.pagination,
            filters: queryParams,
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch work entries',
            loading: false,
          });
        }
      },

      fetchWorkEntryById: async (entryId) => {
        set({ loading: true, error: null });
        try {
          const workEntry = await getWorkEntryByIdApi(entryId);
          set({ selectedWorkEntry: workEntry, loading: false });
          return workEntry;
        } catch (error) {
          console.error('Failed to fetch work entry:', error);
          set({
            loading: false,
            selectedWorkEntry: null,
          });
          return null;
        }
      },

      createWorkEntry: async (entryData) => {
        set({ loading: true, error: null });
        try {
          const newWorkEntry = await createWorkEntryApi(entryData);
          
          // Add to work entries list at the beginning
          const currentEntries = get().workEntries;
          set({
            workEntries: [newWorkEntry, ...currentEntries],
            loading: false,
          });
          
          return newWorkEntry;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create work entry',
            loading: false,
          });
          return null;
        }
      },

      updateWorkEntry: async (entryId, updateData) => {
        set({ loading: true, error: null });
        try {
          const updatedWorkEntry = await updateWorkEntryApi(entryId, updateData);
          
          // Optimized state update
          const currentState = get();
          const currentEntries = currentState.workEntries;
          const updatedEntries = currentEntries.map((entry) =>
            entry._id === entryId ? updatedWorkEntry : entry
          );
          
          // Only update selectedWorkEntry if it's the one being updated
          const newSelectedEntry = currentState.selectedWorkEntry?._id === entryId 
            ? updatedWorkEntry 
            : currentState.selectedWorkEntry;
          
          set({
            workEntries: updatedEntries,
            selectedWorkEntry: newSelectedEntry,
            loading: false,
          });
          
          return updatedWorkEntry;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update work entry',
            loading: false,
          });
          return null;
        }
      },

      deleteWorkEntry: async (entryId) => {
        set({ loading: true, error: null });
        try {
          await deleteWorkEntryApi(entryId);
          
          // Remove from work entries list
          const currentEntries = get().workEntries;
          const filteredEntries = currentEntries.filter((entry) => entry._id !== entryId);
          
          set({
            workEntries: filteredEntries,
            selectedWorkEntry: get().selectedWorkEntry?._id === entryId ? null : get().selectedWorkEntry,
            loading: false,
          });
          
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete work entry',
            loading: false,
          });
          return false;
        }
      },

      fetchStats: async () => {
        set({ loading: true, error: null });
        try {
          const stats = await getWorkEntryStatsApi();
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
        await get().fetchWorkEntries({ ...currentFilters, page });
      },

      changePageSize: async (pageSize) => {
        const currentFilters = get().filters;
        await get().fetchWorkEntries({ ...currentFilters, limit: pageSize, page: 1 });
      },

      // Utility Actions
      refreshWorkEntries: async () => {
        const filters = get().filters;
        await get().fetchWorkEntries(filters);
      },

      resetStore: () => {
        set(initialState);
      },
    }),
    {
      name: 'work-entry-store',
    }
  )
);



