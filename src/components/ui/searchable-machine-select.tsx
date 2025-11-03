import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import apiClient from '@/api/apiClient';
import { useToast } from '@/hooks/use-toast';

interface Machine {
  _id: string;
  name: string;
  description?: string;
}

interface SearchableMachineSelectProps {
  value?: string;
  onValueChange: (machineId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableMachineSelect({
  value,
  onValueChange,
  placeholder = "Search for a machine...",
  disabled = false,
  className
}: SearchableMachineSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const { toast } = useToast();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const formatMachineDisplay = useCallback((machine: Machine) => {
    return machine.name;
  }, []);


  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (searchTerm.length >= 3) {
        setLoading(true);
        try {
          const response = await apiClient.get(`/machines?search=${encodeURIComponent(searchTerm.trim())}&limit=50`);
          const machinesData = response.data.data || response.data;
          setMachines(machinesData);
          setOpen(machinesData.length > 0);
        } catch (error) {
          console.error('Search error:', error);
          toast({
            title: "Search Error",
            description: "Failed to search machines. Please try again.",
            variant: "destructive",
          });
          setMachines([]);
          setOpen(false);
        } finally {
          setLoading(false);
        }
      } else if (searchTerm.length === 0) {
        setMachines([]);
        setOpen(false);
      }
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        if (selectedMachine) {
          const displayText = formatMachineDisplay(selectedMachine);
          setDisplayValue(displayText);
          setSearchTerm(displayText);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedMachine, formatMachineDisplay]);

  // Update selected machine when value changes externally
  useEffect(() => {
    const fetchMachineById = async (machineId: string) => {
      try {
        const response = await apiClient.get(`/machines/${machineId}`);
        const machine = response.data.data || response.data;
        setSelectedMachine(machine);
        const displayText = formatMachineDisplay(machine);
        setDisplayValue(displayText);
        setSearchTerm(displayText);
      } catch (error) {
        console.error('Failed to fetch machine by ID:', error);
        toast({
          title: "Error",
          description: "Failed to load machine details",
          variant: "destructive",
        });
      }
    };

    if (value && value !== selectedMachine?._id) {
      fetchMachineById(value);
    } else if (!value && selectedMachine) {
      setSelectedMachine(null);
      setDisplayValue('');
      setSearchTerm('');
    }
  }, [value, selectedMachine?._id, formatMachineDisplay]);

  const handleMachineSelect = useCallback((machine: Machine) => {
    setSelectedMachine(machine);
    const displayText = formatMachineDisplay(machine);
    setDisplayValue(displayText);
    setSearchTerm(displayText);
    onValueChange(machine._id);
    setOpen(false);
  }, [onValueChange, formatMachineDisplay]);

  const clearSelection = useCallback(() => {
    setSelectedMachine(null);
    setDisplayValue('');
    setSearchTerm('');
    onValueChange('');
    setOpen(false);
    inputRef.current?.focus();
  }, [onValueChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setDisplayValue(newValue);
    
    // If user is typing and has a selection, clear it
    if (selectedMachine && newValue !== formatMachineDisplay(selectedMachine)) {
      setSelectedMachine(null);
      onValueChange('');
    }
  }, [selectedMachine, formatMachineDisplay, onValueChange]);

  const handleInputFocus = useCallback(() => {
    if (selectedMachine) {
      // When focusing on a selected machine, clear the input to allow searching
      setDisplayValue('');
      setSearchTerm('');
    }
  }, [selectedMachine]);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={!disabled ? handleInputFocus : undefined}
          readOnly={disabled}
          className="pr-16"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {selectedMachine && !disabled && !loading && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearSelection();
              }}
              className="h-4 w-4 rounded-sm hover:bg-red-100 hover:text-red-600 flex items-center justify-center"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      
      {open && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-md shadow-lg max-h-[200px] overflow-y-auto"
        >
          {searchTerm.length > 0 && searchTerm.length < 3 && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              Type at least 3 characters to search
            </div>
          )}
          
          {!loading && searchTerm.length >= 3 && machines.length === 0 && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              No machines found
            </div>
          )}
          
          {machines.length > 0 && (
            <div className="p-1">
              {machines.map((machine) => (
                <div
                  key={machine._id}
                  className="flex items-center justify-between p-2 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  onClick={() => handleMachineSelect(machine)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {machine.name}
                    </div>
                    {machine.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {machine.description}
                      </div>
                    )}
                  </div>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4 flex-shrink-0",
                      selectedMachine?._id === machine._id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
