import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  Source,
  getSourcesApi,
  createSourceApi,
  updateSourceApi,
  deleteSourceApi,
  SourceUpdateData
} from '../api/sourceApi';

interface SourceStore {
  // State
  sources: Source[];
  loading: boolean;
  error: string | null;

  // Actions
  setSources: (sources: Source[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // API Actions
  fetchSources: () => Promise<void>;
  createSource: (sourceData: { name: string; description?: string }) => Promise<Source | null>;
  updateSource: (sourceId: string, updateData: SourceUpdateData) => Promise<Source | null>;
  deleteSource: (sourceId: string) => Promise<boolean>;
}

export const useSourceStore = create<SourceStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      sources: [],
      loading: false,
      error: null,

      // Basic setters
      setSources: (sources) => set({ sources }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // API Actions
      fetchSources: async () => {
        set({ loading: true, error: null });
        try {
          const sources = await getSourcesApi();
          set({ sources, loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch sources',
            loading: false,
          });
        }
      },

      createSource: async (sourceData) => {
        set({ loading: true, error: null });
        try {
          const newSource = await createSourceApi(sourceData);
          const currentSources = get().sources;
          set({
            sources: [...currentSources, newSource].sort((a, b) => a.name.localeCompare(b.name)),
            loading: false,
          });
          return newSource;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create source',
            loading: false,
          });
          return null;
        }
      },

      updateSource: async (sourceId, updateData) => {
        set({ loading: true, error: null });
        try {
          const updatedSource = await updateSourceApi(sourceId, updateData);
          const currentSources = get().sources;
          set({
            sources: currentSources
              .map((source) => (source._id === sourceId ? updatedSource : source))
              .sort((a, b) => a.name.localeCompare(b.name)),
            loading: false,
          });
          return updatedSource;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update source',
            loading: false,
          });
          return null;
        }
      },

      deleteSource: async (sourceId) => {
        set({ loading: true, error: null });
        try {
          await deleteSourceApi(sourceId);
          set({
            sources: get().sources.filter((source) => source._id !== sourceId),
            loading: false,
          });
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete source',
            loading: false,
          });
          return false;
        }
      },
    }),
    {
      name: 'source-store',
    }
  )
);
