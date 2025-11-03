import apiClient from './apiClient';
import type { Machine, MachineCreateData, MachineUpdateData } from '../lib/schema';

// Machine API endpoints
export const machineApi = {
  // Get all machines
  async getAllMachines(): Promise<Machine[]> {
    const response = await apiClient.get('/machines');
    return response.data.data;
  },

  // Search machines by name/description
  async searchMachines(query: string): Promise<Machine[]> {
    const response = await apiClient.get('/machines', { params: { search: query } });
    return response.data.data;
  },

  // Get machine by ID
  async getMachineById(id: string): Promise<Machine> {
    const response = await apiClient.get(`/machines/${id}`);
    return response.data.data;
  },

  // Create a new machine
  async createMachine(machineData: MachineCreateData): Promise<Machine> {
    const response = await apiClient.post('/machines', machineData);
    return response.data.data;
  },

  // Update machine by ID
  async updateMachine(id: string, machineData: MachineUpdateData): Promise<Machine> {
    const response = await apiClient.put(`/machines/${id}`, machineData);
    return response.data.data;
  },

  // Delete machine by ID
  async deleteMachine(id: string): Promise<void> {
    await apiClient.delete(`/machines/${id}`);
  }
};

export default machineApi;
