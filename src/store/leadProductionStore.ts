import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  createEmptyLeadProductionSheet,
  getLeadProductionByLeadIdApi,
  upsertLeadProductionByLeadIdApi,
  type LeadProductionSheet,
  type LeadProductionUpsertData,
} from '@/api/leadProductionApi';

interface LeadProductionStore {
  selectedSheet: LeadProductionSheet | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  fetchLeadProduction: (leadId: string) => Promise<LeadProductionSheet | null>;
  saveLeadProduction: (leadId: string, data: LeadProductionUpsertData) => Promise<LeadProductionSheet | null>;
  reset: () => void;
}

export const useLeadProductionStore = create<LeadProductionStore>()(
  devtools((set) => ({
    selectedSheet: null,
    loading: false,
    saving: false,
    error: null,

    fetchLeadProduction: async (leadId) => {
      set({ loading: true, error: null });
      try {
        const sheet = await getLeadProductionByLeadIdApi(leadId);
        set({ selectedSheet: sheet ?? createEmptyLeadProductionSheet(leadId), loading: false });
        return sheet;
      } catch (error) {
        set({
          selectedSheet: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load production details',
        });
        return null;
      }
    },

    saveLeadProduction: async (leadId, data) => {
      set({ saving: true, error: null });
      try {
        const sheet = await upsertLeadProductionByLeadIdApi(leadId, data);
        set({ selectedSheet: sheet, saving: false });
        return sheet;
      } catch (error) {
        set({
          saving: false,
          error: error instanceof Error ? error.message : 'Failed to save production details',
        });
        return null;
      }
    },

    reset: () => set({ selectedSheet: null, loading: false, saving: false, error: null }),
  }))
);
