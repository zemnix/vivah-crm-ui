import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EventDetail {
  eventName: string;
  clientName: string;
  dayNight: 'day' | 'night' | 'both';
  leadId: string;
}

interface EventDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  events: EventDetail[];
}

const dayNightLabels: Record<'day' | 'night' | 'both', string> = {
  day: 'Day',
  night: 'Night',
  both: 'Day & Night',
};

const dayNightColors: Record<'day' | 'night' | 'both', string> = {
  day: 'bg-blue-100 text-blue-800 border-blue-200',
  night: 'bg-purple-100 text-purple-800 border-purple-200',
  both: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

export function EventDetailsDialog({
  open,
  onOpenChange,
  date,
  events,
}: EventDetailsDialogProps) {
  if (!date) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Events on {format(date, 'EEEE, MMMM d, yyyy')}
          </DialogTitle>
          <DialogDescription>
            {events.length === 0
              ? 'No events scheduled for this date'
              : `${events.length} event${events.length > 1 ? 's' : ''} scheduled`}
          </DialogDescription>
        </DialogHeader>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No events found for this date</p>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {events.map((event, index) => (
              <div
                key={`${event.leadId}-${index}`}
                className="flex flex-col gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {event.eventName}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{event.clientName}</span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5',
                      dayNightColors[event.dayNight]
                    )}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {dayNightLabels[event.dayNight]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

