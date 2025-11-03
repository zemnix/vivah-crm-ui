import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Source, getSourcesApi, createSourceApi } from '../api/sourceApi';

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
            sources: [...currentSources, newSource],
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
    }),
    {
      name: 'source-store',
    }
  )
);
