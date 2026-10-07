import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, X } from 'lucide-react';

import { createItemApi, getItemsApi, type Item } from '@/api/itemApi';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SearchableItemSelectProps {
  value?: string;
  onValueChange: (itemName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const DEBOUNCE_MS = 400;
const DROPDOWN_OFFSET_PX = 4;

export function SearchableItemSelect({
  value = '',
  onValueChange,
  placeholder = 'Search item name...',
  disabled = false,
  className,
}: Readonly<SearchableItemSelectProps>) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [displayValue, setDisplayValue] = useState(value);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLElement | null>>([]);

  const normalizedSearchTerm = searchTerm.trim();
  const hasExactMatch = items.some(
    (item) => item.name.trim().toLowerCase() === normalizedSearchTerm.toLowerCase()
  );
  const canCreate = !loading && normalizedSearchTerm.length >= 3 && !hasExactMatch;
  const optionCount = items.length + (canCreate ? 1 : 0);

  useEffect(() => {
    setActiveIndex(-1);
  }, [normalizedSearchTerm, items]);

  useEffect(() => {
    if (activeIndex >= 0) {
      optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const updateDropdownPosition = useCallback(() => {
    if (!inputRef.current) {
      return;
    }

    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + DROPDOWN_OFFSET_PX,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (value === displayValue) {
      return;
    }

    setDisplayValue(value);
    setSearchTerm(value);

    if (!value) {
      setSelectedItem(null);
      setItems([]);
      setOpen(false);
    } else if (selectedItem && value !== selectedItem.name) {
      setSelectedItem(null);
    }
  }, [value, displayValue, selectedItem]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (selectedItem && normalizedSearchTerm === selectedItem.name) {
      setOpen(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (normalizedSearchTerm.length >= 3) {
        setLoading(true);
        try {
          const matchedItems = await getItemsApi({ search: normalizedSearchTerm, limit: 50 });
          setItems(matchedItems);
        } catch (error) {
          console.error('Item search failed:', error);
          toast({
            title: 'Search Error',
            description: 'Failed to search items. Please try again.',
            variant: 'destructive',
          });
          setItems([]);
          setOpen(false);
        } finally {
          setLoading(false);
        }
      } else if (normalizedSearchTerm.length === 0) {
        setItems([]);
      } else {
        setItems([]);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [normalizedSearchTerm, selectedItem, open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        if (selectedItem) {
          setDisplayValue(selectedItem.name);
          setSearchTerm(selectedItem.name);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedItem]);

  useEffect(() => {
    if (!open) {
      return;
    }

    updateDropdownPosition();

    const handleViewportChange = () => {
      updateDropdownPosition();
    };

    // Use capture to react to scroll events from parent containers as well.
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);

    return () => {
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [open, updateDropdownPosition]);

  const handleItemSelect = useCallback((item: Item) => {
    setSelectedItem(item);
    setDisplayValue(item.name);
    setSearchTerm(item.name);
    onValueChange(item.name);
    setOpen(false);
    setItems([]);
  }, [onValueChange]);

  const clearSelection = useCallback(() => {
    setSelectedItem(null);
    setDisplayValue('');
    setSearchTerm('');
    setItems([]);
    onValueChange('');
    setOpen(false);
    inputRef.current?.focus();
  }, [onValueChange]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setDisplayValue(nextValue);
    setSearchTerm(nextValue);
    onValueChange(nextValue);

    if (selectedItem && nextValue !== selectedItem.name) {
      setSelectedItem(null);
    }

    if (nextValue.trim().length >= 3 || nextValue.trim().length > 0) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [onValueChange, selectedItem]);

  const handleInputFocus = useCallback(() => {
    if (disabled) {
      return;
    }

    if (displayValue.trim().length > 0) {
      updateDropdownPosition();
      setOpen(true);
    }
  }, [disabled, displayValue, updateDropdownPosition]);

  const handleCreateItem = useCallback(async () => {
    const itemName = normalizedSearchTerm;
    if (itemName.length < 2 || creating) {
      return;
    }

    setCreating(true);
    try {
      const createdItem = await createItemApi({ name: itemName });
      handleItemSelect(createdItem);
      toast({ description: `Item "${createdItem.name}" added to item master.` });
    } catch (error) {
      console.error('Item create failed:', error);

      try {
        const matchedItems = await getItemsApi({ search: itemName, limit: 10 });
        const exactMatch = matchedItems.find(
          (item) => item.name.trim().toLowerCase() === itemName.toLowerCase()
        );
        if (exactMatch) {
          handleItemSelect(exactMatch);
          toast({ description: `Item "${exactMatch.name}" already exists and has been selected.` });
          return;
        }
      } catch (fallbackError) {
        console.error('Fallback item search failed:', fallbackError);
      }

      toast({
        title: 'Error',
        description: 'Failed to create item.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  }, [creating, normalizedSearchTerm, handleItemSelect, toast]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Enter') return;
    if (!open || optionCount === 0) return;

    event.preventDefault();

    if (event.key === 'ArrowDown') {
      setActiveIndex((current) => (current + 1) % optionCount);
      return;
    }

    if (event.key === 'ArrowUp') {
      setActiveIndex((current) => (current <= 0 ? optionCount - 1 : current - 1));
      return;
    }

    if (activeIndex < 0) return;
    if (canCreate && activeIndex === 0) {
      void handleCreateItem();
      return;
    }
    const item = items[activeIndex - (canCreate ? 1 : 0)];
    if (item) handleItemSelect(item);
  }, [activeIndex, canCreate, handleCreateItem, handleItemSelect, items, open, optionCount]);

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          readOnly={disabled}
          className="pr-16"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {(loading || creating) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {displayValue && !disabled && !loading && !creating && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                clearSelection();
              }}
              className="h-4 w-4 rounded-sm hover:bg-red-100 hover:text-red-600 flex items-center justify-center"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {open && dropdownPosition && createPortal(
        <div
          ref={dropdownRef}
          className="z-[1000] bg-white border rounded-md shadow-lg max-h-[220px] overflow-y-auto"
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          }}
        >
          {normalizedSearchTerm.length > 0 && normalizedSearchTerm.length < 3 && (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              Type at least 3 characters to search
            </div>
          )}

          {!loading && normalizedSearchTerm.length >= 3 && items.length === 0 && (
            <div className="px-2 pt-2 text-sm text-muted-foreground text-center">No items found</div>
          )}

          {canCreate && (
            <div className="p-2">
              <button
                ref={(element) => { optionRefs.current[0] = element; }}
                type="button"
                onClick={() => {
                  void handleCreateItem();
                }}
                onMouseEnter={() => setActiveIndex(0)}
                disabled={creating}
                className={cn(
                  "w-full px-3 py-2 text-sm text-left rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-70 transition-colors",
                  activeIndex === 0 && "ring-2 ring-ring ring-offset-1"
                )}
              >
                Create "{normalizedSearchTerm}"
              </button>
            </div>
          )}

          {items.length > 0 && (
            <div className="p-1">
              {items.map((item, itemIndex) => {
                const optionIndex = itemIndex + (canCreate ? 1 : 0);
                return (
                <div
                  key={item._id}
                  ref={(element) => { optionRefs.current[optionIndex] = element; }}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer",
                    activeIndex === optionIndex && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => handleItemSelect(item)}
                  onMouseEnter={() => setActiveIndex(optionIndex)}
                >
                  <div className="font-medium text-sm truncate">{item.name}</div>
                  <Check
                    className={cn(
                      'ml-2 h-4 w-4 flex-shrink-0',
                      selectedItem?._id === item._id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </div>
                );
              })}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
