import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  SfxConfig,
  SfxConfigCreateData,
  SfxConfigUpdateData,
  createSfxConfigApi,
  getActiveSfxConfigsApi,
  getAllSfxConfigsApi,
  updateSfxConfigApi,
  deleteSfxConfigApi,
} from '../api/sfxConfigApi';

interface SfxConfigStore {
  // State
  sfxConfigs: SfxConfig[];
  selectedSfx: SfxConfig | null;
  loading: boolean;
  error: string | null;

  // Actions
  setSfxConfigs: (sfxConfigs: SfxConfig[]) => void;
  setSelectedSfx: (sfx: SfxConfig | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // API Actions
  fetchActiveSfxConfigs: () => Promise<void>;
  fetchAllSfxConfigs: () => Promise<void>;
  createSfx: (sfxData: SfxConfigCreateData) => Promise<SfxConfig | null>;
  updateSfx: (
    sfxId: string,
    updateData: SfxConfigUpdateData
  ) => Promise<SfxConfig | null>;
  deleteSfx: (sfxId: string, hardDelete?: boolean) => Promise<boolean>;
  
  // Utility Actions
  getSfxById: (sfxId: string) => SfxConfig | undefined;
  refreshSfxConfigs: () => Promise<void>;
  resetStore: () => void;
}

const initialState = {
  sfxConfigs: [],
  selectedSfx: null,
  loading: false,
  error: null,
};

export const useSfxConfigStore = create<SfxConfigStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Setters
      setSfxConfigs: (sfxConfigs) => set({ sfxConfigs }),
      setSelectedSfx: (sfx) => set({ selectedSfx: sfx }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // API Actions
      fetchActiveSfxConfigs: async () => {
        set({ loading: true, error: null });
        try {
          const sfxConfigs = await getActiveSfxConfigsApi();
          set({
            sfxConfigs: sfxConfigs,
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch active SFX configs',
            loading: false,
          });
        }
      },

      fetchAllSfxConfigs: async () => {
        set({ loading: true, error: null });
        try {
          const sfxConfigs = await getAllSfxConfigsApi();
          set({
            sfxConfigs: sfxConfigs,
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch SFX configs',
            loading: false,
          });
        }
      },

      createSfx: async (sfxData) => {
        set({ loading: true, error: null });
        try {
          const newSfx = await createSfxConfigApi(sfxData);

          // Add to sfxConfigs list
          const currentSfxConfigs = get().sfxConfigs;
          const updatedSfxConfigs = [...currentSfxConfigs, newSfx].sort((a, b) => 
            a.name.localeCompare(b.name)
          );

          set({
            sfxConfigs: updatedSfxConfigs,
            loading: false,
          });

          return newSfx;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create SFX config',
            loading: false,
          });
          return null;
        }
      },

      updateSfx: async (sfxId, updateData) => {
        set({ loading: true, error: null });
        try {
          const updatedSfx = await updateSfxConfigApi(sfxId, updateData);

          // Update in sfxConfigs list
          const currentSfxConfigs = get().sfxConfigs;
          const updatedSfxConfigs = currentSfxConfigs
            .map((sfx) => (sfx._id === sfxId ? updatedSfx : sfx))
            .sort((a, b) => a.name.localeCompare(b.name));

          set({
            sfxConfigs: updatedSfxConfigs,
            selectedSfx:
              get().selectedSfx?._id === sfxId ? updatedSfx : get().selectedSfx,
            loading: false,
          });

          return updatedSfx;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update SFX config',
            loading: false,
          });
          return null;
        }
      },

      deleteSfx: async (sfxId, hardDelete = false) => {
        set({ loading: true, error: null });
        try {
          await deleteSfxConfigApi(sfxId, hardDelete);

          if (hardDelete) {
            // Remove from sfxConfigs list
            const currentSfxConfigs = get().sfxConfigs;
            const filteredSfxConfigs = currentSfxConfigs.filter((sfx) => sfx._id !== sfxId);
            set({
              sfxConfigs: filteredSfxConfigs,
              selectedSfx: get().selectedSfx?._id === sfxId ? null : get().selectedSfx,
              loading: false,
            });
          } else {
            // Mark as inactive in sfxConfigs list
            const currentSfxConfigs = get().sfxConfigs;
            const updatedSfxConfigs = currentSfxConfigs.map((sfx) =>
              sfx._id === sfxId ? { ...sfx, isActive: false } : sfx
            );
            set({
              sfxConfigs: updatedSfxConfigs,
              selectedSfx: get().selectedSfx?._id === sfxId ? null : get().selectedSfx,
              loading: false,
            });
          }

          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete SFX config',
            loading: false,
          });
          return false;
        }
      },

      // Utility Actions
      getSfxById: (sfxId) => {
        return get().sfxConfigs.find((sfx) => sfx._id === sfxId);
      },

      refreshSfxConfigs: async () => {
        await get().fetchAllSfxConfigs();
      },

      resetStore: () => {
        set(initialState);
      },
    }),
    {
      name: 'sfx-config-store',
    }
  )
);

