import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchLeadsApi, Lead, getLeadByIdApi } from '@/api/leadApi';
import { useToast } from '@/hooks/use-toast';

interface SearchableLeadSelectProps {
  value?: string;
  onValueChange: (leadId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableLeadSelect({
  value,
  onValueChange,
  placeholder = "Search for a lead by name, location, or mobile...",
  disabled = false,
  className
}: SearchableLeadSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const { toast } = useToast();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const formatLeadDisplay = useCallback((lead: Lead) => {
    const parts = [lead.name];
    if (lead.location) parts.push(lead.location);
    if (lead.mobile) parts.push(lead.mobile);
    return parts.join(' • ');
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
          const searchResults = await searchLeadsApi(searchTerm.trim());
          setLeads(searchResults);
          setOpen(searchResults.length > 0);
        } catch (error) {
          console.error('Search error:', error);
          toast({
            title: "Search Error",
            description: "Failed to search leads. Please try again.",
            variant: "destructive",
          });
          setLeads([]);
          setOpen(false);
        } finally {
          setLoading(false);
        }
      } else if (searchTerm.length === 0) {
        setLeads([]);
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
        if (selectedLead) {
          const displayText = formatLeadDisplay(selectedLead);
          setDisplayValue(displayText);
          setSearchTerm(displayText);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedLead, formatLeadDisplay]);

  // Update selected lead when value changes externally
  useEffect(() => {
    const fetchLeadById = async (leadId: string) => {
      try {
        const lead = await getLeadByIdApi(leadId);
        setSelectedLead(lead);
        const displayText = formatLeadDisplay(lead);
        setDisplayValue(displayText);
        setSearchTerm(displayText);
      } catch (error) {
        console.error('Failed to fetch lead by ID:', error);
        toast({
          title: "Error",
          description: "Failed to load lead details",
          variant: "destructive",
        });
      }
    };

    if (value && value !== selectedLead?._id) {
      // If we have a value but no selected lead or different lead, fetch it
      fetchLeadById(value);
    } else if (!value && selectedLead) {
      setSelectedLead(null);
      setDisplayValue('');
      setSearchTerm('');
    }
  }, [value, selectedLead?._id, formatLeadDisplay, toast]);

  const handleLeadSelect = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    const displayText = formatLeadDisplay(lead);
    setDisplayValue(displayText);
    setSearchTerm(displayText);
    onValueChange(lead._id);
    setOpen(false);
  }, [onValueChange, formatLeadDisplay]);

  const clearSelection = useCallback(() => {
    setSelectedLead(null);
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
    if (selectedLead && newValue !== formatLeadDisplay(selectedLead)) {
      setSelectedLead(null);
      onValueChange('');
    }
  }, [selectedLead, formatLeadDisplay, onValueChange]);

  const handleInputFocus = useCallback(() => {
    if (selectedLead) {
      // When focusing on a selected lead, clear the input to allow searching
      setDisplayValue('');
      setSearchTerm('');
    }
  }, [selectedLead]);

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
          {selectedLead && !disabled && !loading && (
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
          
          {!loading && searchTerm.length >= 3 && leads.length === 0 && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              No leads found
            </div>
          )}
          
          {leads.length > 0 && (
            <div className="p-1">
              {leads.map((lead) => (
                <div
                  key={lead._id}
                  className="flex items-center justify-between p-2 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  onClick={() => handleLeadSelect(lead)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {lead.name}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {lead.location && (
                        <span className="truncate">{lead.location}</span>
                      )}
                      {lead.mobile && (
                        <span className="font-mono">{lead.mobile}</span>
                      )}
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4 flex-shrink-0",
                      selectedLead?._id === lead._id ? "opacity-100" : "opacity-0"
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