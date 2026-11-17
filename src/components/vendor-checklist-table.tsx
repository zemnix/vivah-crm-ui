import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import type { Lead } from '@/api/leadApi';
import { getVendorChecklistsApi, saveVendorChecklistApi, VENDOR_CHECKLIST_STATUSES, type VendorChecklistRow, type VendorChecklistStatus } from '@/api/vendorChecklistApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchableVendorMasterSelect } from '@/components/ui/searchable-vendor-master-select';
import { toIndiaEventDateOnly } from '@/lib/event-date';
import { toast } from '@/hooks/use-toast';

type DraftRow = VendorChecklistRow & { clientId: string };
const keyFor = (name: string, date: string) => `${name.trim()}::${new Date(date).toISOString()}`;
const draftRow = (row?: VendorChecklistRow): DraftRow => ({
  particulars: '', assignee: '', vendor: '', vendorName: '', responsiblePerson: '', status: 'Not started', time: '', remarks: '',
  ...row, clientId: row?._id || crypto.randomUUID(),
});
const statusClasses: Record<VendorChecklistStatus, string> = {
  Booked: 'bg-blue-100 text-blue-800',
  'Not started': 'bg-red-100 text-red-800',
  'In progress': 'bg-amber-100 text-amber-800',
  Done: 'bg-green-100 text-green-800',
};

export function VendorChecklistTable({ lead }: { lead: Lead }) {
  const [rowsByEvent, setRowsByEvent] = useState<Record<string, DraftRow[]>>({});
  const [selectedKey, setSelectedKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [creatingCount, setCreatingCount] = useState(0);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [retry, setRetry] = useState(0);
  const events = useMemo(() => (lead.typesOfEvent || [])
    .filter((event) => event.name?.trim() && event.date && !Number.isNaN(new Date(event.date).getTime()))
    .map((event) => ({ ...event, key: keyFor(event.name, event.date) })), [lead.typesOfEvent]);
  const selectedEvent = events.find((event) => event.key === selectedKey) || events[0];
  const key = selectedEvent?.key || '';
  const rows = rowsByEvent[key] || [];
  const busy = saving || creatingCount > 0;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    getVendorChecklistsApi(lead._id).then((data) => {
      if (!active) return;
      const next: Record<string, DraftRow[]> = {};
      for (const sheet of data) next[keyFor(sheet.eventName, sheet.eventDate)] = sheet.rows.map(draftRow);
      setRowsByEvent(next);
      setDirty(new Set());
      setSelectedKey('');
    }).catch((err) => {
      if (active) setLoadError(err instanceof Error ? err.message : 'Could not load the vendor checklist.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lead._id, retry]);

  useEffect(() => {
    if (dirty.size === 0) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const changeRows = (update: (current: DraftRow[]) => DraftRow[]) => {
    setRowsByEvent((current) => ({ ...current, [key]: update(current[key] || []) }));
    setDirty((current) => new Set(current).add(key));
  };
  const updateRow = <K extends keyof VendorChecklistRow>(id: string, field: K, value: VendorChecklistRow[K]) =>
    changeRows((current) => current.map((row) => row.clientId === id ? { ...row, [field]: value } : row));
  const save = async () => {
    if (!selectedEvent || busy) return;
    setSaving(true);
    try {
      const payload = rows.map((row): VendorChecklistRow => ({
        ...(row._id ? { _id: row._id } : {}),
        particulars: row.particulars, assignee: row.assignee, vendor: row.vendor, vendorName: row.vendorName,
        responsiblePerson: row.responsiblePerson, status: row.status, time: row.time, remarks: row.remarks,
      }));
      const saved = await saveVendorChecklistApi(lead._id, { eventName: selectedEvent.name, eventDate: selectedEvent.date, rows: payload });
      setRowsByEvent((current) => ({ ...current, [key]: saved.rows.map(draftRow) }));
      setDirty((current) => { const next = new Set(current); next.delete(key); return next; });
      toast.success('Vendor checklist saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the vendor checklist.');
    } finally { setSaving(false); }
  };

  return <Card data-testid="vendor-checklist">
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
      <CardTitle>Vendor Checklist</CardTitle>
      {!loading && !loadError && selectedEvent && <div className="flex flex-wrap items-center gap-2">
        <Select value={key} onValueChange={setSelectedKey} disabled={busy}>
          <SelectTrigger aria-label="Vendor checklist event" className="w-[240px]"><SelectValue /></SelectTrigger>
          <SelectContent>{events.map((event) => <SelectItem key={event.key} value={event.key}>
            {event.name} — {toIndiaEventDateOnly(event.date)}{dirty.has(event.key) ? ' *' : ''}
          </SelectItem>)}</SelectContent>
        </Select>
        <Button type="button" size="sm" onClick={() => void save()} disabled={busy}>
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}Save
        </Button>
      </div>}
    </CardHeader>
    <CardContent className="space-y-3">
      {loading ? <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin" aria-label="Loading vendor checklist" /></div>
        : loadError ? <div role="alert"><p className="text-sm text-destructive">{loadError}</p><Button type="button" variant="outline" onClick={() => setRetry((n) => n + 1)}>Retry</Button></div>
        : !selectedEvent ? <p className="text-sm text-muted-foreground">Add an event date to this lead to create its vendor checklist.</p>
        : <>
          {dirty.has(key) && <p className="text-xs text-amber-700" role="status">Unsaved changes for this event. Click Save to keep them.</p>}
          <ScrollArea className="w-full"><div className="min-w-[1500px]"><Table>
            <TableHeader><TableRow>
              {['Particulars', 'Assignee', 'Vendor', 'Vendor Name', 'Responsible Person', 'Status', 'Time', 'Remarks'].map((name) => <TableHead key={name}>{name}</TableHead>)}
            </TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No checklist rows yet. Add a row to get started.</TableCell></TableRow>}
              {rows.map((row, index) => <TableRow key={row.clientId}>
                <TableCell className="w-[260px] align-top"><div className="flex items-start gap-1">
                  <Button type="button" size="icon" variant="ghost" aria-label={`Add checklist row below row ${index + 1}`}
                    title="Add row below" disabled={busy || rows.length >= 500}
                    onClick={() => changeRows((current) => current.length >= 500 ? current : current.flatMap((item) =>
                      item.clientId === row.clientId ? [item, draftRow()] : [item]))}><Plus className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" aria-label={`Remove checklist row ${index + 1}`} disabled={busy}
                    onClick={() => changeRows((current) => current.filter((item) => item.clientId !== row.clientId))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  <Textarea aria-label={`Particulars row ${index + 1}`} value={row.particulars} maxLength={2000} disabled={busy} onChange={(e) => updateRow(row.clientId, 'particulars', e.target.value)} />
                </div></TableCell>
                <TableCell className="w-[160px] align-top"><Input aria-label={`Assignee row ${index + 1}`} value={row.assignee} maxLength={500} disabled={busy} onChange={(e) => updateRow(row.clientId, 'assignee', e.target.value)} /></TableCell>
                <TableCell className="w-[190px] align-top"><SearchableVendorMasterSelect kind="vendor" value={row.vendor} disabled={busy}
                  onValueChange={(value) => updateRow(row.clientId, 'vendor', value)} onCreatingChange={(active) => setCreatingCount((n) => n + (active ? 1 : -1))} /></TableCell>
                <TableCell className="w-[210px] align-top"><SearchableVendorMasterSelect kind="vendor-name" value={row.vendorName} disabled={busy}
                  onValueChange={(value) => updateRow(row.clientId, 'vendorName', value)} onCreatingChange={(active) => setCreatingCount((n) => n + (active ? 1 : -1))} /></TableCell>
                <TableCell className="w-[180px] align-top"><Input aria-label={`Responsible Person row ${index + 1}`} value={row.responsiblePerson} maxLength={500} disabled={busy} onChange={(e) => updateRow(row.clientId, 'responsiblePerson', e.target.value)} /></TableCell>
                <TableCell className="w-[160px] align-top"><Select value={row.status} disabled={busy} onValueChange={(value: VendorChecklistStatus) => updateRow(row.clientId, 'status', value)}>
                  <SelectTrigger aria-label={`Status row ${index + 1}`} className={statusClasses[row.status]}><SelectValue /></SelectTrigger>
                  <SelectContent>{VENDOR_CHECKLIST_STATUSES.map((status) => <SelectItem key={status} value={status}><span className={`rounded px-2 py-0.5 ${statusClasses[status]}`}>{status}</span></SelectItem>)}</SelectContent>
                </Select></TableCell>
                <TableCell className="w-[120px] align-top"><Input aria-label={`Time row ${index + 1}`} value={row.time} maxLength={200} placeholder="e.g. 1.5 hrs" disabled={busy} onChange={(e) => updateRow(row.clientId, 'time', e.target.value)} /></TableCell>
                <TableCell className="w-[240px] align-top"><Textarea aria-label={`Remarks row ${index + 1}`} value={row.remarks} maxLength={5000} disabled={busy} onChange={(e) => updateRow(row.clientId, 'remarks', e.target.value)} /></TableCell>
              </TableRow>)}
            </TableBody>
          </Table></div><ScrollBar orientation="horizontal" /></ScrollArea>
          <Button type="button" size="sm" variant="outline" disabled={busy || rows.length >= 500} onClick={() => changeRows((current) => [...current, draftRow()])}>
            <Plus className="mr-1 h-4 w-4" />Add Row
          </Button>
        </>}
    </CardContent>
  </Card>;
}
