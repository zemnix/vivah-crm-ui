import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Machine, MachineCreateData, MachineUpdateData } from '../lib/schema';
import { machineApi } from '../api/machineApi';

interface MachineStore {
  // State
  machines: Machine[];
  loading: boolean;
  error: string | null;
  selectedMachine: Machine | null;

  // Actions
  setMachines: (machines: Machine[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setSelectedMachine: (machine: Machine | null) => void;

  // API Actions
  fetchMachines: () => Promise<void>;
  getMachineById: (id: string) => Promise<Machine | null>;
  searchMachines: (query: string) => Promise<Machine[]>;
  createMachine: (machineData: MachineCreateData) => Promise<Machine | null>;
  updateMachine: (id: string, machineData: MachineUpdateData) => Promise<Machine | null>;
  deleteMachine: (id: string) => Promise<boolean>;
}

export const useMachineStore = create<MachineStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      machines: [],
      loading: false,
      error: null,
      selectedMachine: null,

      // Basic setters
      setMachines: (machines) => set({ machines }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
      setSelectedMachine: (machine) => set({ selectedMachine: machine }),

      // API Actions
      fetchMachines: async () => {
        set({ loading: true, error: null });
        try {
          const machines = await machineApi.getAllMachines();
          set({ machines, loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch machines',
            loading: false,
          });
        }
      },

      getMachineById: async (id: string) => {
        set({ loading: true, error: null });
        try {
          const machine = await machineApi.getMachineById(id);
          set({ selectedMachine: machine, loading: false });
          return machine;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch machine',
            loading: false,
          });
          return null;
        }
      },

      searchMachines: async (query: string) => {
        // Do not flip global loading for typeahead; just return results
        try {
          if (!query || query.trim().length < 3) return [];
          const results = await machineApi.searchMachines(query.trim());
          return results;
        } catch (error) {
          // Do not set global error for transient searches
          return [];
        }
      },

      createMachine: async (machineData: MachineCreateData) => {
        set({ loading: true, error: null });
        try {
          const newMachine = await machineApi.createMachine(machineData);
          const currentMachines = get().machines;
          set({
            machines: [...currentMachines, newMachine],
            loading: false,
          });
          return newMachine;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create machine',
            loading: false,
          });
          return null;
        }
      },

      updateMachine: async (id: string, machineData: MachineUpdateData) => {
        set({ loading: true, error: null });
        try {
          const updatedMachine = await machineApi.updateMachine(id, machineData);
          const currentMachines = get().machines;
          const updatedMachines = currentMachines.map(machine =>
            machine._id === id ? updatedMachine : machine
          );
          set({
            machines: updatedMachines,
            selectedMachine: get().selectedMachine?._id === id ? updatedMachine : get().selectedMachine,
            loading: false,
          });
          return updatedMachine;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update machine',
            loading: false,
          });
          return null;
        }
      },

      deleteMachine: async (id: string) => {
        set({ loading: true, error: null });
        try {
          await machineApi.deleteMachine(id);
          const currentMachines = get().machines;
          const filteredMachines = currentMachines.filter(machine => machine._id !== id);
          set({
            machines: filteredMachines,
            selectedMachine: get().selectedMachine?._id === id ? null : get().selectedMachine,
            loading: false,
          });
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete machine',
            loading: false,
          });
          return false;
        }
      },
    }),
    {
      name: 'machine-store',
    }
  )
);
