import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  BaraatFieldConfig,
  BaraatFieldConfigCreateData,
  BaraatFieldConfigUpdateData,
  createBaraatFieldConfigApi,
  getActiveBaraatFieldConfigsApi,
  getAllBaraatFieldConfigsApi,
  updateBaraatFieldConfigApi,
  deleteBaraatFieldConfigApi,
} from '../api/baraatConfigApi';

interface BaraatConfigStore {
  // State
  fields: BaraatFieldConfig[];
  activeFields: BaraatFieldConfig[];
  selectedField: BaraatFieldConfig | null;
  loading: boolean;
  error: string | null;

  // Actions
  setFields: (fields: BaraatFieldConfig[]) => void;
  setActiveFields: (fields: BaraatFieldConfig[]) => void;
  setSelectedField: (field: BaraatFieldConfig | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // API Actions
  fetchActiveFields: () => Promise<void>;
  fetchAllFields: () => Promise<void>;
  createField: (fieldData: BaraatFieldConfigCreateData) => Promise<BaraatFieldConfig | null>;
  updateField: (
    fieldId: string,
    updateData: BaraatFieldConfigUpdateData
  ) => Promise<BaraatFieldConfig | null>;
  deleteField: (fieldId: string, hardDelete?: boolean) => Promise<boolean>;
  
  // Utility Actions
  getFieldByKey: (key: string) => BaraatFieldConfig | undefined;
  getFieldsByType: (type: string) => BaraatFieldConfig[];
  refreshFields: () => Promise<void>;
  resetStore: () => void;
}

const initialState = {
  fields: [],
  activeFields: [],
  selectedField: null,
  loading: false,
  error: null,
};

export const useBaraatConfigStore = create<BaraatConfigStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Setters
      setFields: (fields) => set({ fields }),
      setActiveFields: (activeFields) => set({ activeFields }),
      setSelectedField: (field) => set({ selectedField: field }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // API Actions
      fetchActiveFields: async () => {
        set({ loading: true, error: null });
        try {
          const fields = await getActiveBaraatFieldConfigsApi();
          set({
            activeFields: fields,
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch active fields',
            loading: false,
          });
        }
      },

      fetchAllFields: async () => {
        set({ loading: true, error: null });
        try {
          const fields = await getAllBaraatFieldConfigsApi();
          set({
            fields: fields,
            activeFields: fields.filter((f) => f.isActive),
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch fields',
            loading: false,
          });
        }
      },

      createField: async (fieldData) => {
        set({ loading: true, error: null });
        try {
          const newField = await createBaraatFieldConfigApi(fieldData);

          // Add to fields list
          const currentFields = get().fields;
          const updatedFields = [...currentFields, newField].sort((a, b) => a.order - b.order);

          set({
            fields: updatedFields,
            activeFields: newField.isActive
              ? [...get().activeFields, newField].sort((a, b) => a.order - b.order)
              : get().activeFields,
            loading: false,
          });

          return newField;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create field',
            loading: false,
          });
          return null;
        }
      },

      updateField: async (fieldId, updateData) => {
        set({ loading: true, error: null });
        try {
          const updatedField = await updateBaraatFieldConfigApi(fieldId, updateData);

          // Update in fields list
          const currentFields = get().fields;
          const updatedFields = currentFields
            .map((field) => (field._id === fieldId ? updatedField : field))
            .sort((a, b) => a.order - b.order);

          // Update active fields if needed
          const currentActiveFields = get().activeFields;
          let updatedActiveFields: BaraatFieldConfig[];

          if (updatedField.isActive) {
            // If field is active, add or update it in activeFields
            const existingIndex = currentActiveFields.findIndex((f) => f._id === fieldId);
            if (existingIndex >= 0) {
              updatedActiveFields = currentActiveFields
                .map((field) => (field._id === fieldId ? updatedField : field))
                .sort((a, b) => a.order - b.order);
            } else {
              updatedActiveFields = [...currentActiveFields, updatedField].sort(
                (a, b) => a.order - b.order
              );
            }
          } else {
            // If field is not active, remove it from activeFields
            updatedActiveFields = currentActiveFields
              .filter((field) => field._id !== fieldId)
              .sort((a, b) => a.order - b.order);
          }

          set({
            fields: updatedFields,
            activeFields: updatedActiveFields,
            selectedField:
              get().selectedField?._id === fieldId ? updatedField : get().selectedField,
            loading: false,
          });

          return updatedField;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update field',
            loading: false,
          });
          return null;
        }
      },

      deleteField: async (fieldId, hardDelete = false) => {
        set({ loading: true, error: null });
        try {
          await deleteBaraatFieldConfigApi(fieldId, hardDelete);

          // Remove from fields list
          const currentFields = get().fields;
          const filteredFields = currentFields.filter((field) => field._id !== fieldId);

          // Remove from active fields
          const currentActiveFields = get().activeFields;
          const filteredActiveFields = currentActiveFields.filter(
            (field) => field._id !== fieldId
          );

          set({
            fields: filteredFields,
            activeFields: filteredActiveFields,
            selectedField: get().selectedField?._id === fieldId ? null : get().selectedField,
            loading: false,
          });

          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete field',
            loading: false,
          });
          return false;
        }
      },

      // Utility Actions
      getFieldByKey: (key) => {
        return get().fields.find((field) => field.key === key);
      },

      getFieldsByType: (type) => {
        return get().fields.filter((field) => field.type === type);
      },

      refreshFields: async () => {
        await get().fetchAllFields();
      },

      resetStore: () => {
        set(initialState);
      },
    }),
    {
      name: 'baraat-config-store',
    }
  )
);

