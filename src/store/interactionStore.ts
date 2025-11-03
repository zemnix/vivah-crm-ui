import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  Interaction,
  InteractionData,
  InteractionFilters,
  InteractionType,
  CallStatus,
  createInteractionApi,
  getInteractionsApi,
  getInteractionByIdApi,
  updateInteractionApi,
  deleteInteractionApi,
  getInteractionStatsApi,
  InteractionListResponse,
  InteractionStatsResponse,
} from '../api/interactionApi';

interface InteractionStore {
  // State
  interactions: Interaction[];
  selectedInteraction: Interaction | null;
  stats: InteractionStatsResponse | null;
  pagination: InteractionListResponse['pagination'] | null;
  loading: boolean;
  error: string | null;
  filters: InteractionFilters;

  // Actions
  setInteractions: (interactions: Interaction[]) => void;
  setSelectedInteraction: (interaction: Interaction | null) => void;
  setStats: (stats: InteractionStatsResponse) => void;
  setPagination: (pagination: InteractionListResponse['pagination']) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: InteractionFilters) => void;
  clearError: () => void;

  // API Actions
  fetchInteractions: (params?: InteractionFilters) => Promise<void>;
  fetchInteractionById: (interactionId: string) => Promise<Interaction | null>;
  createInteraction: (interactionData: InteractionData) => Promise<Interaction | null>;
  updateInteraction: (interactionId: string, updateData: Partial<InteractionData>) => Promise<Interaction | null>;
  updateInteractionStatus: (interactionId: string, status: CallStatus, remarks?: string) => Promise<Interaction | null>;
  updateInteractionStatusOptimistic: (interactionId: string, status: CallStatus, remarks?: string) => Promise<boolean>;
  deleteInteraction: (interactionId: string) => Promise<boolean>;
  fetchStats: () => Promise<void>;
  
  // Pagination Actions
  changePage: (page: number) => Promise<void>;
  changePageSize: (pageSize: number) => Promise<void>;
  
  // Utility Actions
  getInteractionsByStatus: (status: CallStatus) => Interaction[];
  getInteractionsByType: (type: InteractionType) => Interaction[];
  getInteractionsByLead: (leadId: string) => Interaction[];
  getTodaysInteractions: () => Interaction[];
  getUpcomingInteractions: () => Interaction[];
  searchInteractions: (query: string) => Interaction[];
  refreshInteractions: () => Promise<void>;
  resetStore: () => void;
}

const initialFilters: InteractionFilters = {
  page: 1,
  limit: 10,
};

const initialState = {
  interactions: [],
  selectedInteraction: null,
  stats: null,
  pagination: null,
  loading: false,
  error: null,
  filters: initialFilters,
};

export const useInteractionStore = create<InteractionStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Setters
      setInteractions: (interactions) => set({ interactions }),
      setSelectedInteraction: (interaction) => set({ selectedInteraction: interaction }),
      setStats: (stats) => set({ stats }),
      setPagination: (pagination) => set({ pagination }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),
      clearError: () => set({ error: null }),

      // API Actions
      fetchInteractions: async (params) => {
        set({ loading: true, error: null });
        try {
          const queryParams = { ...get().filters, ...params };
          const response = await getInteractionsApi(queryParams);
          
          set({
            interactions: response.interactions,
            pagination: response.pagination,
            filters: queryParams,
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch interactions',
            loading: false,
          });
        }
      },

      fetchInteractionById: async (interactionId) => {
        set({ loading: true, error: null });
        try {
          const interaction = await getInteractionByIdApi(interactionId);
          set({ selectedInteraction: interaction, loading: false });
          return interaction;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch interaction',
            loading: false,
            selectedInteraction: null,
          });
          return null;
        }
      },

      createInteraction: async (interactionData) => {
        set({ loading: true, error: null });
        try {
          const newInteraction = await createInteractionApi(interactionData);
          
          // Add to interactions list at the beginning
          const currentInteractions = get().interactions;
          set({
            interactions: [newInteraction, ...currentInteractions],
            loading: false,
          });
          
          return newInteraction;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create interaction',
            loading: false,
          });
          return null;
        }
      },

      updateInteraction: async (interactionId, updateData) => {
        set({ loading: true, error: null });
        try {
          const updatedInteraction = await updateInteractionApi(interactionId, updateData);
          
          // Optimized state update
          const currentState = get();
          const currentInteractions = currentState.interactions;
          const updatedInteractions = currentInteractions.map((interaction) =>
            interaction._id === interactionId ? updatedInteraction : interaction
          );
          
          // Only update selectedInteraction if it's the one being updated
          const newSelectedInteraction = currentState.selectedInteraction?._id === interactionId 
            ? updatedInteraction 
            : currentState.selectedInteraction;
          
          set({
            interactions: updatedInteractions,
            selectedInteraction: newSelectedInteraction,
            loading: false,
          });
          
          return updatedInteraction;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update interaction',
            loading: false,
          });
          return null;
        }
      },

      updateInteractionStatus: async (interactionId, status, remarks) => {
        const updateData: Partial<InteractionData> = { status };
        if (remarks) {
          updateData.remarks = remarks;
        }
        
        return get().updateInteraction(interactionId, updateData);
      },

      updateInteractionStatusOptimistic: async (interactionId, status, remarks) => {
        const currentState = get();
        const interaction = currentState.interactions.find(i => i._id === interactionId);
        
        if (!interaction) {
          return false;
        }

        // Store original values for rollback
        const originalStatus = interaction.status;
        const originalRemarks = interaction.remarks;

        // Optimistically update the UI immediately
        const updatedInteractions = currentState.interactions.map((i) =>
          i._id === interactionId ? { ...i, status, remarks: remarks || i.remarks } : i
        );

        const newSelectedInteraction = currentState.selectedInteraction?._id === interactionId 
          ? { ...currentState.selectedInteraction, status, remarks: remarks || currentState.selectedInteraction.remarks }
          : currentState.selectedInteraction;

        // Update UI immediately without setting loading: true
        set({
          interactions: updatedInteractions,
          selectedInteraction: newSelectedInteraction,
          error: null,
        });

        try {
          // Make API call in background
          const updateData: Partial<InteractionData> = { status };
          if (remarks) {
            updateData.remarks = remarks;
          }
          await updateInteractionApi(interactionId, updateData);
          return true;
        } catch (error) {
          // Rollback on error
          const rollbackInteractions = get().interactions.map((i) =>
            i._id === interactionId ? { ...i, status: originalStatus, remarks: originalRemarks } : i
          );

          const rollbackSelectedInteraction = get().selectedInteraction;

          set({
            interactions: rollbackInteractions,
            selectedInteraction: rollbackSelectedInteraction,
            error: error instanceof Error ? error.message : 'Failed to update interaction status',
          });
          
          return false;
        }
      },

      deleteInteraction: async (interactionId) => {
        set({ loading: true, error: null });
        try {
          await deleteInteractionApi(interactionId);
          
          // Remove from interactions list
          const currentInteractions = get().interactions;
          const filteredInteractions = currentInteractions.filter((interaction) => interaction._id !== interactionId);
          
          set({
            interactions: filteredInteractions,
            selectedInteraction: get().selectedInteraction?._id === interactionId ? null : get().selectedInteraction,
            loading: false,
          });
          
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete interaction',
            loading: false,
          });
          return false;
        }
      },

      fetchStats: async () => {
        set({ loading: true, error: null });
        try {
          const stats = await getInteractionStatsApi();
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
        await get().fetchInteractions({ ...currentFilters, page });
      },

      changePageSize: async (pageSize) => {
        const currentFilters = get().filters;
        await get().fetchInteractions({ ...currentFilters, limit: pageSize, page: 1 });
      },

      // Utility Actions
      getInteractionsByStatus: (status) => {
        return get().interactions.filter((interaction) => interaction.status === status);
      },

      getInteractionsByType: (type) => {
        return get().interactions.filter((interaction) => interaction.type === type);
      },

      getInteractionsByLead: (leadId) => {
        return get().interactions.filter((interaction) => {
          const interactionLeadId = typeof interaction.leadId === 'object' 
            ? interaction.leadId._id 
            : interaction.leadId;
          return interactionLeadId === leadId;
        });
      },

      getTodaysInteractions: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return get().interactions.filter((interaction) => {
          const interactionDate = new Date(
            typeof interaction.date === 'object' 
              ? interaction.date.iso 
              : interaction.date
          );
          return interactionDate >= today && interactionDate < tomorrow;
        });
      },

      getUpcomingInteractions: () => {
        const now = new Date();
        
        return get().interactions.filter((interaction) => {
          if (interaction.status !== 'scheduled') return false;
          
          const interactionDate = new Date(
            typeof interaction.date === 'object' 
              ? interaction.date.iso 
              : interaction.date
          );
          return interactionDate > now;
        }).sort((a, b) => {
          const dateA = new Date(typeof a.date === 'object' ? a.date.iso : a.date);
          const dateB = new Date(typeof b.date === 'object' ? b.date.iso : b.date);
          return dateA.getTime() - dateB.getTime();
        });
      },

      searchInteractions: (query) => {
        const interactions = get().interactions;
        const lowercaseQuery = query.toLowerCase();
        
        return interactions.filter((interaction) => {
          const leadName = typeof interaction.leadId === 'object' 
            ? interaction.leadId.name?.toLowerCase() 
            : '';
          const staffName = typeof interaction.staffId === 'object' 
            ? interaction.staffId.name?.toLowerCase() 
            : '';
          const remarks = interaction.remarks?.toLowerCase() || '';
          
          return leadName.includes(lowercaseQuery) ||
                 staffName.includes(lowercaseQuery) ||
                 remarks.includes(lowercaseQuery) ||
                 interaction.type.toLowerCase().includes(lowercaseQuery) ||
                 interaction.status.toLowerCase().includes(lowercaseQuery);
        });
      },

      refreshInteractions: async () => {
        const filters = get().filters;
        await get().fetchInteractions(filters);
      },

      resetStore: () => {
        set(initialState);
      },
    }),
    {
      name: 'interaction-store',
    }
  )
);