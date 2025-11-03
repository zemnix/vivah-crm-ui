import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { uploadFileApi, UploadResponse } from '@/api/uploadApi';

interface UploadState {
  // UI State
  isUploading: boolean;
  error: string | null;
  
  // Actions
  uploadFile: (file: File) => Promise<UploadResponse>;
  uploadPDF: (pdfBlob: Blob, filename: string) => Promise<UploadResponse>;
  clearError: () => void;
}

export const useUploadStore = create<UploadState>()(
  devtools(
    (set) => ({
      // UI State
      isUploading: false,
      error: null,

      // Actions
      uploadFile: async (file: File) => {
        set({ isUploading: true, error: null });
        try {
          const response = await uploadFileApi(file);
          set({ isUploading: false });
          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
          set({ error: errorMessage, isUploading: false });
          throw error;
        }
      },

      uploadPDF: async (pdfBlob: Blob, filename: string) => {
        set({ isUploading: true, error: null });
        try {
          // Convert Blob to File
          const file = new File([pdfBlob], filename, { type: 'application/pdf' });
          const response = await uploadFileApi(file);
          set({ isUploading: false });
          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to upload PDF';
          set({ error: errorMessage, isUploading: false });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'upload-store',
    }
  )
);
