import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { 
  getProgressionByLeadIdApi, 
  upsertProgressionApi, 
  updateProgressionApi,
  initializeProgressionApi,
  type ClientProgression,
  type ProgressionStatus,
  type EventStatus
} from '@/api/clientProgressionApi';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Lead } from '@/api/leadApi';

interface ClientProgressionTableProps {
  lead: Lead;
}

const PROGRESSION_STATUSES: ProgressionStatus[] = ['Not started', 'In progress', 'Completed'];
const EVENT_STATUSES: EventStatus[] = ['Booked', 'Not started', 'In progress', 'Completed', 'Cancelled'];

const getStatusColorClasses = (status: string): string => {
  switch (status) {
    case 'Not started':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'In progress':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'Completed':
      return 'bg-green-100 text-green-800 border-green-300';
    default:
      return '';
  }
};

export function ClientProgressionTable({ lead }: ClientProgressionTableProps) {
  const [progressions, setProgressions] = useState<ClientProgression[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const { toast } = useToast();

  // Initialize progression records from lead events if they don't exist
  useEffect(() => {
    const initializeAndFetch = async () => {
      if (!lead?._id || lead.status !== 'converted' || initialized) return;

      setLoading(true);
      try {
        // First, try to initialize progression records from events
        if (lead.typesOfEvent && lead.typesOfEvent.length > 0) {
          await initializeProgressionApi(lead._id);
        }
        
        // Then fetch all progression records
        const data = await getProgressionByLeadIdApi(lead._id);
        setProgressions(data);
        setInitialized(true);
      } catch (error) {
        console.error('Failed to fetch progression:', error);
        toast({
          title: 'Error',
          description: 'Failed to load client progression data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    initializeAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?._id, lead?.status]);

  // Create progression records from events if they don't exist in the fetched data
  const tableData = useMemo(() => {
    if (!lead?.typesOfEvent || lead.typesOfEvent.length === 0 || !initialized) {
      return [];
    }

    return lead.typesOfEvent.map((event) => {
      // Find existing progression for this event
      const eventDateStr = format(new Date(event.date), 'yyyy-MM-dd');
      const existing = progressions.find(
        (p) => p.eventName === event.name && 
               format(new Date(p.eventDate), 'yyyy-MM-dd') === eventDateStr
      );

      if (existing) {
        return existing;
      }

      // Return a new progression object with defaults (not yet saved)
      return {
        _id: `temp-${event.name}-${eventDateStr}`,
        leadId: lead._id,
        eventName: event.name,
        eventDate: event.date,
        venue: '',
        status: 'Booked' as EventStatus,
        ppt: 'Not started' as ProgressionStatus,
        site: 'Not started' as ProgressionStatus,
        twoD: 'Not started' as ProgressionStatus,
        excelDetailing: 'Not started' as ProgressionStatus,
        contractForm: 'Not started' as ProgressionStatus,
        eventPaymentDetails: 'Not started' as ProgressionStatus,
        eventBudget: 'Not started' as ProgressionStatus,
        vendorData: 'Not started' as ProgressionStatus,
        crewManagement: 'Not started' as ProgressionStatus,
        checklist: 'Not started' as ProgressionStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as ClientProgression;
    });
  }, [lead?._id, lead?.typesOfEvent, progressions, initialized]);

  const handleFieldChange = async (
    progression: ClientProgression,
    field: keyof ClientProgression,
    value: string
  ) => {
    // Prevent saving if already saving this record
    if (saving === progression._id) return;

    const isNew = progression._id.startsWith('temp-');
    const progressionId = progression._id;

    // Check if value actually changed
    if (progression[field] === value) return;

    // Update local state optimistically
    setProgressions((prev) => {
      const existing = prev.find((p) => p._id === progressionId);
      if (isNew && !existing) {
        // Add new record
        return [...prev, { ...progression, [field]: value }];
      } else {
        // Update existing record
        return prev.map((p) =>
          p._id === progressionId ? { ...p, [field]: value } : p
        );
      }
    });

    setSaving(progressionId);

    try {
      if (isNew) {
        // Create new progression record with all current values
        const currentProgression = { ...progression, [field]: value };
        const newProgression = await upsertProgressionApi({
          leadId: currentProgression.leadId,
          eventName: currentProgression.eventName,
          eventDate: currentProgression.eventDate,
          venue: currentProgression.venue,
          status: currentProgression.status,
          ppt: currentProgression.ppt,
          site: currentProgression.site,
          twoD: currentProgression.twoD,
          excelDetailing: currentProgression.excelDetailing,
          contractForm: currentProgression.contractForm,
          eventPaymentDetails: currentProgression.eventPaymentDetails,
          eventBudget: currentProgression.eventBudget,
          vendorData: currentProgression.vendorData,
          crewManagement: currentProgression.crewManagement,
          checklist: currentProgression.checklist,
        });

        // Replace temp ID with real ID
        setProgressions((prev) =>
          prev.map((p) => (p._id === progressionId ? newProgression : p))
        );
      } else {
        // Update existing progression record
        await updateProgressionApi(progressionId, { [field]: value });
      }
    } catch (error) {
      console.error('Failed to save progression:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save progression',
        variant: 'destructive',
      });

      // Revert optimistic update
      setProgressions((prev) =>
        prev.map((p) =>
          p._id === progressionId ? progression : p
        )
      );
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Client Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tableData.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Progression</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="min-w-[1200px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Event Name</TableHead>
                  <TableHead className="min-w-[120px]">Event Date</TableHead>
                  <TableHead className="min-w-[150px]">Venue</TableHead>
                  <TableHead className="min-w-[120px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">PPT</TableHead>
                  <TableHead className="min-w-[100px]">SITE</TableHead>
                  <TableHead className="min-w-[100px]">2D</TableHead>
                  <TableHead className="min-w-[120px]">EXCEL-DETAILING</TableHead>
                  <TableHead className="min-w-[120px]">CONTRACT-FORM</TableHead>
                  <TableHead className="min-w-[150px]">EVENT-PAYMENT DETAILS</TableHead>
                  <TableHead className="min-w-[120px]">EVENT BUDGET</TableHead>
                  <TableHead className="min-w-[120px]">VENDOR DATA</TableHead>
                  <TableHead className="min-w-[130px]">CREW MANAGEMENT</TableHead>
                  <TableHead className="min-w-[100px]">CHECKLIST</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((progression) => (
                  <TableRow key={progression._id}>
                    <TableCell className="font-medium">
                      {progression.eventName}
                    </TableCell>
                    <TableCell>
                      {format(new Date(progression.eventDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Input
                        // Uncontrolled input so user can type; we persist on blur.
                        // Key forces re-mount when backend value changes (e.g., after save).
                        key={`${progression._id}-${progression.venue}`}
                        defaultValue={progression.venue}
                        onBlur={(e) => {
                          const newValue = e.target.value;
                          handleFieldChange(progression, 'venue', newValue);
                        }}
                        placeholder="Enter venue"
                        className="w-full"
                        disabled={saving === progression._id}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={progression.status}
                        onValueChange={(value) =>
                          handleFieldChange(progression, 'status', value as EventStatus)
                        }
                        disabled={saving === progression._id}
                      >
                        <SelectTrigger className={`w-full ${getStatusColorClasses(progression.status)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EVENT_STATUSES.map((status) => (
                            <SelectItem key={status} value={status} className={getStatusColorClasses(status)}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={progression.ppt}
                        onValueChange={(value) =>
                          handleFieldChange(progression, 'ppt', value as ProgressionStatus)
                        }
                        disabled={saving === progression._id}
                      >
                        <SelectTrigger className={`w-full ${getStatusColorClasses(progression.ppt)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROGRESSION_STATUSES.map((status) => (
                            <SelectItem key={status} value={status} className={getStatusColorClasses(status)}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={progression.site}
                        onValueChange={(value) =>
                          handleFieldChange(progression, 'site', value as ProgressionStatus)
                        }
                        disabled={saving === progression._id}
                      >
                        <SelectTrigger className={`w-full ${getStatusColorClasses(progression.site)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROGRESSION_STATUSES.map((status) => (
                            <SelectItem key={status} value={status} className={getStatusColorClasses(status)}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={progression.twoD}
                        onValueChange={(value) =>
                          handleFieldChange(progression, 'twoD', value as ProgressionStatus)
                        }
                        disabled={saving === progression._id}
                      >
                        <SelectTrigger className={`w-full ${getStatusColorClasses(progression.twoD)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROGRESSION_STATUSES.map((status) => (
                            <SelectItem key={status} value={status} className={getStatusColorClasses(status)}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={progression.excelDetailing}
                        onValueChange={(value) =>
                          handleFieldChange(progression, 'excelDetailing', value as ProgressionStatus)
                        }
                        disabled={saving === progression._id}
                      >
                        <SelectTrigger className={`w-full ${getStatusColorClasses(progression.excelDetailing)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROGRESSION_STATUSES.map((status) => (
                            <SelectItem key={status} value={status} className={getStatusColorClasses(status)}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={progression.contractForm}
                        onValueChange={(value) =>
                          handleFieldChange(progression, 'contractForm', value as ProgressionStatus)
                        }
                        disabled={saving === progression._id}
                      >
                        <SelectTrigger className={`w-full ${getStatusColorClasses(progression.contractForm)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROGRESSION_STATUSES.map((status) => (
                            <SelectItem key={status} value={status} className={getStatusColorClasses(status)}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={progression.eventPaymentDetails}
                        onValueChange={(value) =>
                          handleFieldChange(progression, 'eventPaymentDetails', value as ProgressionStatus)
                        }
                        disabled={saving === progression._id}
                      >
                        <SelectTrigger className={`w-full ${getStatusColorClasses(progression.eventPaymentDetails)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROGRESSION_STATUSES.map((status) => (
                            <SelectItem key={status} value={status} className={getStatusColorClasses(status)}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={progression.eventBudget}
                        onValueChange={(value) =>
                          handleFieldChange(progression, 'eventBudget', value as ProgressionStatus)
                        }
                        disabled={saving === progression._id}
                      >
                        <SelectTrigger className={`w-full ${getStatusColorClasses(progression.eventBudget)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROGRESSION_STATUSES.map((status) => (
                            <SelectItem key={status} value={status} className={getStatusColorClasses(status)}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={progression.vendorData}
                        onValueChange={(value) =>
                          handleFieldChange(progression, 'vendorData', value as ProgressionStatus)
                        }
                        disabled={saving === progression._id}
                      >
                        <SelectTrigger className={`w-full ${getStatusColorClasses(progression.vendorData)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROGRESSION_STATUSES.map((status) => (
                            <SelectItem key={status} value={status} className={getStatusColorClasses(status)}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={progression.crewManagement}
                        onValueChange={(value) =>
                          handleFieldChange(progression, 'crewManagement', value as ProgressionStatus)
                        }
                        disabled={saving === progression._id}
                      >
                        <SelectTrigger className={`w-full ${getStatusColorClasses(progression.crewManagement)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROGRESSION_STATUSES.map((status) => (
                            <SelectItem key={status} value={status} className={getStatusColorClasses(status)}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={progression.checklist}
                        onValueChange={(value) =>
                          handleFieldChange(progression, 'checklist', value as ProgressionStatus)
                        }
                        disabled={saving === progression._id}
                      >
                        <SelectTrigger className={`w-full ${getStatusColorClasses(progression.checklist)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROGRESSION_STATUSES.map((status) => (
                            <SelectItem key={status} value={status} className={getStatusColorClasses(status)}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
