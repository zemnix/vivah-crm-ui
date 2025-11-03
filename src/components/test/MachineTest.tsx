import React, { useEffect, useState } from 'react';
import { useMachineStore } from '../../store/machineStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const MachineTest: React.FC = () => {
  const {
    machines,
    loading,
    error,
    fetchMachines,
    createMachine,
    deleteMachine,
    clearError
  } = useMachineStore();

  const [machineName, setMachineName] = useState('');
  const [machineDescription, setMachineDescription] = useState('');

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  const handleCreateMachine = async () => {
    if (!machineName.trim()) return;
    
    const result = await createMachine({
      name: machineName,
      description: machineDescription || undefined
    });
    
    if (result) {
      setMachineName('');
      setMachineDescription('');
    }
  };

  const handleDeleteMachine = async (id: string) => {
    await deleteMachine(id);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Machine Management Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create Machine Form */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Create New Machine</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Machine name"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
              />
              <Input
                placeholder="Description (optional)"
                value={machineDescription}
                onChange={(e) => setMachineDescription(e.target.value)}
              />
              <Button onClick={handleCreateMachine} disabled={loading}>
                {loading ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearError}
                className="ml-2"
              >
                Clear
              </Button>
            </div>
          )}

          {/* Machines List */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Machines ({machines.length})</h3>
            {loading && <p>Loading machines...</p>}
            {machines.length === 0 && !loading && <p>No machines found</p>}
            {machines.map((machine) => (
              <div key={machine._id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <h4 className="font-medium">{machine.name}</h4>
                  {machine.description && (
                    <p className="text-sm text-gray-600">{machine.description}</p>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteMachine(machine._id)}
                  disabled={loading}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MachineTest;
