import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { createVendorMasterApi, listVendorMastersApi, type VendorMasterEntry, type VendorMasterKind } from '@/api/vendorChecklistApi';
import { toast } from '@/hooks/use-toast';

interface Props {
  kind: VendorMasterKind;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  onCreatingChange?: (creating: boolean) => void;
}

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');

export function SearchableVendorMasterSelect({ kind, value, onValueChange, disabled, onCreatingChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<VendorMasterEntry[]>([]);
  const [completedQuery, setCompletedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const label = kind === 'vendor' ? 'Vendor' : 'Vendor Name';
  const term = normalize(search);

  useEffect(() => {
    if (!open || term.length < 2) return;
    let active = true;
    setLoading(true);
    setError('');
    setCompletedQuery('');
    const timeout = setTimeout(async () => {
      try {
        const data = await listVendorMastersApi(kind, { search: term, limit: 50 });
        if (active) {
          setItems(data.items);
          setCompletedQuery(term);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        if (active) setLoading(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(timeout); };
  }, [kind, term, open, retry]);

  const ready = term.length >= 2 && completedQuery === term && !loading && !error;
  const exactMatch = items.some((item) => normalize(item.name).toLowerCase() === term.toLowerCase());
  const select = (name: string) => { onValueChange(name); setOpen(false); };
  const create = async () => {
    if (!ready || exactMatch || creating) return;
    setCreating(true);
    onCreatingChange?.(true);
    try {
      const item = await createVendorMasterApi(kind, term);
      select(item.name);
      toast.success(`${label} saved`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not create ${label.toLowerCase()}`);
    } finally {
      setCreating(false);
      onCreatingChange?.(false);
    }
  };

  return <div className="flex min-w-0 items-center gap-1">
    <Popover open={open} onOpenChange={(next) => {
      if (creating) return;
      setOpen(next);
      if (next) { setSearch(''); setItems([]); setCompletedQuery(''); setError(''); }
    }}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-label={`Select ${label}`} aria-expanded={open}
          disabled={disabled || creating} className="w-full min-w-0 justify-between font-normal">
          <span className="truncate">{value || `Select ${label.toLowerCase()}…`}</span>
          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] max-w-[90vw] p-0">
        <Command shouldFilter={false}>
          <CommandInput aria-label={`Search ${label}`} placeholder="Type at least 2 characters…" value={search}
            onValueChange={setSearch} disabled={creating} maxLength={200} />
          <CommandList aria-busy={loading || creating}>
            {creating ? <p className="flex items-center gap-2 p-3 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Creating…</p>
              : term.length < 2 ? <p className="p-3 text-sm text-muted-foreground">Type at least 2 characters to search.</p>
              : error ? <div className="p-3 text-sm"><p role="alert">{error}</p><Button type="button" variant="ghost" onClick={() => setRetry((n) => n + 1)}>Retry search</Button></div>
              : !ready ? <p className="flex items-center gap-2 p-3 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Searching…</p>
              : <>
                {items.length === 0 && <p className="p-3 text-sm text-muted-foreground">No matches found.</p>}
                {items.map((item) => <CommandItem key={item._id} value={item._id} onSelect={() => select(item.name)}>
                  <Check className={value === item.name ? 'opacity-100' : 'opacity-0'} />{item.name}
                </CommandItem>)}
                {!exactMatch && <CommandItem value="create-new-entry" onSelect={() => void create()}>
                  <Plus />Create “{term}”
                </CommandItem>}
              </>}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    {value && <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label={`Clear ${label}`}
      disabled={disabled || creating} onClick={() => onValueChange('')}><X className="h-3 w-3" /></Button>}
  </div>;
}
