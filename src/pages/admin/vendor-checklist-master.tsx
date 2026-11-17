import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { createVendorMasterApi, deleteVendorMasterApi, listVendorMastersApi, updateVendorMasterApi, type VendorMasterEntry, type VendorMasterKind } from '@/api/vendorChecklistApi';
import { toast } from '@/hooks/use-toast';

export default function AdminVendorChecklistMaster({ kind }: { kind: VendorMasterKind }) {
  const navigate = useNavigate();
  const label = kind === 'vendor' ? 'Vendor' : 'Vendor Name';
  const [items, setItems] = useState<VendorMasterEntry[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VendorMasterEntry | null>(null);
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState<VendorMasterEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const limit = 30;

  useEffect(() => {
    setPage(1); setSearch(''); setDialogOpen(false); setDeleting(null);
  }, [kind]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const timeout = setTimeout(async () => {
      try {
        const data = await listVendorMastersApi(kind, { search, page, limit });
        if (active) { setItems(data.items); setTotal(data.total); }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load master entries.');
      } finally { if (active) setLoading(false); }
    }, 300);
    return () => { active = false; clearTimeout(timeout); };
  }, [kind, search, page, refresh]);

  const openEditor = (item: VendorMasterEntry | null) => {
    setEditing(item); setName(item?.name || ''); setDialogOpen(true);
  };
  const save = async () => {
    const normalized = name.trim().replace(/\s+/g, ' ');
    if (normalized.length < 2) { toast.warning('Enter at least 2 characters.'); return; }
    setSaving(true);
    try {
      if (editing) await updateVendorMasterApi(kind, editing._id, normalized);
      else await createVendorMasterApi(kind, normalized);
      setDialogOpen(false);
      setRefresh((n) => n + 1);
      toast.success(`${label} saved`);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not save entry.'); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await deleteVendorMasterApi(kind, deleting._id);
      setDeleting(null);
      if (items.length === 1 && page > 1) setPage((n) => n - 1);
      else setRefresh((n) => n + 1);
      toast.success(`${label} removed`);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not remove entry.'); }
    finally { setSaving(false); }
  };

  return <DashboardLayout>
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <Button type="button" variant="ghost" onClick={() => navigate('/admin/master-config')}><ArrowLeft className="mr-2 h-4 w-4" />Master Configuration</Button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">{label} Master</h1><p className="mt-1 text-sm text-muted-foreground">Manage reusable {label.toLowerCase()} options for the Vendor Checklist.</p></div>
        <Button type="button" onClick={() => openEditor(null)}><Plus className="mr-2 h-4 w-4" />Add {label}</Button>
      </div>
      <Input aria-label={`Search ${label} master`} placeholder={`Search ${label.toLowerCase()}…`} maxLength={200} value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-md" />
      <Card><CardContent className="pt-5">
        {loading ? <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin" aria-label="Loading master entries" /></div>
          : error ? <div role="alert"><p className="text-destructive">{error}</p><Button type="button" variant="outline" onClick={() => setRefresh((n) => n + 1)}>Retry</Button></div>
          : <Table><TableHeader><TableRow><TableHead>{label}</TableHead><TableHead className="w-[120px]">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.length === 0 && <TableRow><TableCell colSpan={2} className="py-8 text-center text-muted-foreground">No entries found.</TableCell></TableRow>}
              {items.map((item) => <TableRow key={item._id}>
                <TableCell>{item.name}</TableCell><TableCell className="space-x-1">
                  <Button type="button" size="icon" variant="ghost" aria-label={`Edit ${item.name}`} onClick={() => openEditor(item)}><Pencil className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${item.name}`} onClick={() => setDeleting(item)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>)}
            </TableBody>
          </Table>}
      </CardContent></Card>
      {!loading && !error && <div className="flex items-center justify-between gap-3 text-sm">
        <span>{total} entries · Page {page} of {Math.max(1, Math.ceil(total / limit))}</span>
        <div className="flex gap-2"><Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>Previous</Button>
          <Button type="button" variant="outline" disabled={page * limit >= total} onClick={() => setPage((n) => n + 1)}>Next</Button></div>
      </div>}
    </div>
    <Dialog open={dialogOpen} onOpenChange={(open) => { if (!saving) setDialogOpen(open); }}>
      <DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} {label}</DialogTitle><DialogDescription>Available independently in every event’s Vendor Checklist.</DialogDescription></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="space-y-4">
          <label className="block space-y-2"><span className="text-sm font-medium">Name</span><Input value={name} autoFocus maxLength={200} required disabled={saving} onChange={(e) => setName(e.target.value)} /></label>
          <DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={saving || name.trim().length < 2}>{saving ? 'Saving…' : 'Save'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <DeleteConfirmationDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open && !saving) setDeleting(null); }}
      onConfirm={() => void remove()} isLoading={saving} title={`Remove ${label}`} itemName={deleting?.name}
      description="Remove this option from future searches? Existing checklist rows will keep their saved text." />
  </DashboardLayout>;
}
