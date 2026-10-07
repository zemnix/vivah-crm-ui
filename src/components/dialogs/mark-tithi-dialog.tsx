import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarDays, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { replaceTithisApi } from '@/api/tithiApi';

interface MarkTithiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tithiDates: string[];
  onSaved: (dates: string[]) => void;
}

export function MarkTithiDialog({
  open,
  onOpenChange,
  tithiDates,
  onSaved,
}: MarkTithiDialogProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setSelectedDates(tithiDates.map((date) => parseISO(date)));
    }
  }, [open, tithiDates]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dates = selectedDates
        .map((date) => format(date, 'yyyy-MM-dd'))
        .sort();
      const savedTithis = await replaceTithisApi(dates);
      onSaved(savedTithis.map((tithi) => tithi.date));
      toast({ title: 'Tithi dates saved' });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Unable to save Tithi dates',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Mark Tithi
          </DialogTitle>
          <DialogDescription>
            Select every Tithi date. Select an already marked date again to remove it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center rounded-md border">
          <Calendar
            mode="multiple"
            selected={selectedDates}
            onSelect={(dates) => setSelectedDates(dates || [])}
            captionLayout="dropdown"
            disabled={isSaving}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          {selectedDates.length} date{selectedDates.length === 1 ? '' : 's'} marked
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Tithi dates
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
