import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { District, getDistrictsApi, createDistrictApi } from '../api/districtApi';

interface DistrictStore {
  // State
  districts: District[];
  loading: boolean;
  error: string | null;

  // Actions
  setDistricts: (districts: District[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // API Actions
  fetchDistricts: () => Promise<void>;
  createDistrict: (districtData: { name: string; state?: string }) => Promise<District | null>;
}

export const useDistrictStore = create<DistrictStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      districts: [],
      loading: false,
      error: null,

      // Basic setters
      setDistricts: (districts) => set({ districts }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // API Actions
      fetchDistricts: async () => {
        set({ loading: true, error: null });
        try {
          const districts = await getDistrictsApi();
          set({ districts, loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch districts',
            loading: false,
          });
        }
      },

      createDistrict: async (districtData) => {
        set({ loading: true, error: null });
        try {
          const newDistrict = await createDistrictApi(districtData);
          const currentDistricts = get().districts;
          set({
            districts: [...currentDistricts, newDistrict],
            loading: false,
          });
          return newDistrict;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create district',
            loading: false,
          });
          return null;
        }
      },
    }),
    {
      name: 'district-store',
    }
  )
);
