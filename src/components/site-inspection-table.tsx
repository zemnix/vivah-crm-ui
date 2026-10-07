import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSiteInspectionsByLeadIdApi, saveSiteInspectionApi, type SiteInspection, type SiteInspectionItem } from '@/api/siteInspectionApi';
import { uploadFileApi } from '@/api/uploadApi';
import type { Lead } from '@/api/leadApi';
import { useToast } from '@/hooks/use-toast';
import { ExternalLink, Loader2, Paperclip, Plus, Save, Trash2, Upload, X } from 'lucide-react';

interface SiteInspectionTableProps { lead: Lead }

const dateValue = (value?: string | null) => value ? value.split('T')[0] : '';
const inputClass = 'border-2 border-gray-200 bg-background focus-visible:border-gray-300 focus-visible:ring-0';
const DEFAULT_ITEM_NAMES = [
  'Main Gate',
  'Passage',
  'Sub Gate',
  'Stage',
  'Backdrop',
  'Mandap',
  'Samiana',
  'Walling',
  'Kitchen',
  'Chairs',
  'Tables',
  'Sofas',
  'DG Backup',
  'Entry & Exit Timings',
];

const emptyItem = (): SiteInspectionItem => ({
  _id: `temp-${crypto.randomUUID()}`,
  site_inspection_id: '', item_name: '', measurement: null, nos: null, attachment_url: null,
});

const defaultItems = (inspectionId = ''): SiteInspectionItem[] =>
  DEFAULT_ITEM_NAMES.map((name) => ({
    _id: `temp-${crypto.randomUUID()}`,
    site_inspection_id: inspectionId,
    item_name: name,
    measurement: null,
    nos: null,
    attachment_url: null,
  }));

const sameInspectionEvent = (left: Pick<SiteInspection, 'event_date' | 'event_type'>, right: Pick<SiteInspection, 'event_date' | 'event_type'>) =>
  left.event_type === right.event_type && dateValue(left.event_date) === dateValue(right.event_date);

const createDraftInspections = (lead: Lead, savedInspections: SiteInspection[]): SiteInspection[] => {
  const leadVenue = lead.customer?.venueName?.trim() || '';
  return (lead.typesOfEvent || [])
    .filter((event) => event.name?.trim() && event.date)
    .map((event, index) => {
      const draftBase = {
        event_date: event.date,
        event_type: event.name,
      };
      const saved = savedInspections.find((inspection) => sameInspectionEvent(inspection, draftBase));
      if (saved) {
        return {
          ...saved,
          event_venue: saved.event_venue?.trim() ? saved.event_venue : leadVenue,
          items: saved.items?.length ? saved.items : defaultItems(saved._id),
        };
      }
      return {
        _id: `temp-site-inspection-${index}`,
        lead_id: lead._id,
        event_date: event.date,
        event_venue: leadVenue,
        event_type: event.name,
        venue_floor: '',
        visited_date: null,
        visited_by: '',
        remarks: null,
        items: defaultItems(),
        createdAt: '',
        updatedAt: '',
      };
    });
};

export function SiteInspectionTable({ lead }: SiteInspectionTableProps) {
  const [inspections, setInspections] = useState<SiteInspection[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!['converted', 'completed'].includes(lead.status)) return;
    let mounted = true;
    const drafts = createDraftInspections(lead, []);
    setInspections(drafts);
    setSelectedId((current) => drafts.some((inspection) => inspection._id === current) ? current : drafts[0]?._id || '');
    setLoading(false);

    getSiteInspectionsByLeadIdApi(lead._id)
      .then((data) => {
        if (!mounted) return;
        const merged = createDraftInspections(lead, data);
        setInspections(merged);
        setSelectedId((current) => merged.some((inspection) => inspection._id === current) ? current : merged[0]?._id || '');
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, [lead]);

  const selected = useMemo(() => inspections.find((value) => value._id === selectedId), [inspections, selectedId]);
  const updateInspection = (update: (value: SiteInspection) => SiteInspection) => setInspections((values) => values.map((value) => value._id === selectedId ? update(value) : value));
  const updateField = (field: 'venue_floor' | 'visited_date' | 'visited_by' | 'remarks', value: string) => updateInspection((inspection) => ({
    ...inspection,
    [field]: field === 'visited_date' || field === 'remarks' ? value || null : value,
  }));
  const updateItem = (id: string, field: keyof SiteInspectionItem, value: string | null) => updateInspection((inspection) => ({ ...inspection, items: inspection.items.map((item) => item._id === id ? { ...item, [field]: value } : item) }));

  const uploadAttachment = async (id: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadingId(id);
    try {
      const result = await uploadFileApi(file);
      updateItem(id, 'attachment_url', result.fileURL);
      toast({ title: 'Attachment uploaded', description: 'Save the inspection to keep it.' });
    } catch (error) {
      toast({ title: 'Upload failed', description: error instanceof Error ? error.message : 'Upload failed.', variant: 'destructive' });
    } finally { setUploadingId(null); }
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const previousId = selected._id;
      const saved = await saveSiteInspectionApi(lead._id, {
        event_date: selected.event_date, event_type: selected.event_type,
        venue_floor: selected.venue_floor || '', visited_date: selected.visited_date || null,
        visited_by: selected.visited_by || '', remarks: selected.remarks || null,
        items: selected.items.filter((item) => item.item_name.trim()).map((item) => ({ item_name: item.item_name, measurement: item.measurement || null, nos: item.nos || null, attachment_url: item.attachment_url || null })),
      });
      setInspections((values) => {
        const next = values.map((value) => value._id === previousId || sameInspectionEvent(value, saved) ? saved : value);
        return next.some((value) => value._id === saved._id) ? next : [saved, ...next];
      });
      setSelectedId(saved._id);
      toast({ title: 'Site inspection saved' });
    } catch (error) {
      toast({ title: 'Save failed', description: error instanceof Error ? error.message : 'Save failed.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (!['converted', 'completed'].includes(lead.status)) return null;
  if (loading) return <Card><CardHeader><CardTitle>Site Inspection</CardTitle></CardHeader><CardContent className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></CardContent></Card>;
  if (!selected) return <Card><CardHeader><CardTitle>Site Inspection</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Add an event date to this lead to create its site inspection.</CardContent></Card>;

  return <Card>
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3"><CardTitle>Site Inspection</CardTitle><div className="flex items-center gap-2">
      {inspections.length > 1 && <Select value={selectedId} onValueChange={setSelectedId}><SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger><SelectContent>{inspections.map((value) => <SelectItem key={value._id} value={value._id}>{value.event_type} — {dateValue(value.event_date)}</SelectItem>)}</SelectContent></Select>}
      <Button size="sm" onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}Save</Button>
    </div></CardHeader>
    <CardContent className="space-y-6">
      <div className="grid grid-cols-1 gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
        <Field label="Event Date"><Input type="date" value={dateValue(selected.event_date)} disabled /></Field>
        <Field label="Visited Date"><Input type="date" value={dateValue(selected.visited_date)} onChange={(e) => updateField('visited_date', e.target.value)} className={inputClass} /></Field>
        <Field label="Event Venue"><Input value={selected.event_venue} disabled /></Field>
        <Field label="Visited By"><Input value={selected.visited_by || ''} onChange={(e) => updateField('visited_by', e.target.value)} placeholder="Name of visitor" className={inputClass} /></Field>
        <Field label="Event Type"><Input value={selected.event_type} disabled /></Field>
        <Field label="Venue Floor"><Input value={selected.venue_floor || ''} onChange={(e) => updateField('venue_floor', e.target.value)} placeholder="Enter venue floor" className={inputClass} /></Field>
      </div>
      <ScrollArea className="w-full whitespace-nowrap"><div className="min-w-[900px]"><Table>
        <TableHeader><TableRow><TableHead>Particulars</TableHead><TableHead>Measurement (feet / L × W × H)</TableHead><TableHead>Nos.</TableHead><TableHead>Attachment</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>{selected.items.map((item) => <TableRow key={item._id}>
          <TableCell><Input value={item.item_name} onChange={(e) => updateItem(item._id, 'item_name', e.target.value)} placeholder="Item name" className={inputClass} /></TableCell>
          <TableCell><Input value={item.measurement || ''} onChange={(e) => updateItem(item._id, 'measurement', e.target.value)} placeholder="e.g. 20 × 10 × 8" className={inputClass} /></TableCell>
          <TableCell><Input value={item.nos || ''} onChange={(e) => updateItem(item._id, 'nos', e.target.value)} placeholder="Nos." className={inputClass} /></TableCell>
          <TableCell><div className="flex items-center gap-2"><Button size="sm" variant="outline" asChild disabled={uploadingId === item._id}><label className="cursor-pointer">{uploadingId === item._id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}Upload<input type="file" className="hidden" onChange={(e) => uploadAttachment(item._id, e)} /></label></Button>
            {item.attachment_url && <><a href={item.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-primary hover:underline"><Paperclip className="mr-1 h-4 w-4" />View<ExternalLink className="ml-1 h-3 w-3" /></a><Button size="icon" variant="ghost" onClick={() => updateItem(item._id, 'attachment_url', null)} aria-label="Remove attachment"><X className="h-4 w-4" /></Button></>}
          </div></TableCell>
          <TableCell><Button size="icon" variant="ghost" onClick={() => updateInspection((value) => ({ ...value, items: value.items.filter((row) => row._id !== item._id) }))} aria-label="Remove item"><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
        </TableRow>)}</TableBody>
      </Table></div><ScrollBar orientation="horizontal" /></ScrollArea>
      <Button size="sm" variant="outline" onClick={() => updateInspection((value) => ({ ...value, items: [...value.items, emptyItem()] }))}><Plus className="mr-1 h-4 w-4" />Add Item</Button>
      <Field label="Remarks"><Textarea value={selected.remarks || ''} onChange={(e) => updateField('remarks', e.target.value)} placeholder="Enter site inspection remarks" className="min-h-28" /></Field>
    </CardContent>
  </Card>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground">{label}</p>{children}</div>;
}
