import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  addMonths, 
  subMonths, 
  startOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isToday
} from 'date-fns';
import { cn } from '@/lib/utils';
import { getLeadsApi, Lead, TypeOfEvent } from '@/api/leadApi';
import { EventDetailsDialog } from './dialogs/event-details-dialog';
import { Button } from '@/components/ui/button';

interface EventDetail {
  eventName: string;
  clientName: string;
  dayNight: 'day' | 'night' | 'both';
  leadId: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Custom Calendar Grid Component that stretches to full width
function CalendarGrid({
  month,
  eventsByDate,
  onDateClick,
}: {
  month: Date;
  eventsByDate: Map<string, EventDetail[]>;
  onDateClick: (date: Date) => void;
}) {
  // Generate all days to display (including days from prev/next month to fill the grid)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days: Date[] = [];
    let currentDate = calendarStart;

    while (currentDate <= calendarEnd) {
      days.push(currentDate);
      currentDate = addDays(currentDate, 1);
    }

    return days;
  }, [month]);

  // Group days into weeks
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  return (
    <div className="w-full border rounded-md overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 w-full bg-muted/30">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar weeks */}
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 w-full">
          {week.map((date) => {
            const dateKey = format(startOfDay(date), 'yyyy-MM-dd');
            const events = eventsByDate.get(dateKey) || [];
            const hasEvents = events.length > 0;
            const isCurrentMonth = isSameMonth(date, month);
            const isTodayDate = isToday(date);

            return (
              <button
                key={dateKey}
                onClick={() => onDateClick(date)}
                className={cn(
                  "relative w-full min-h-[80px] p-1 border-t border-l first:border-l-0 flex flex-col items-center transition-colors hover:bg-accent/50",
                  !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                  hasEvents && isCurrentMonth && "bg-primary/5",
                  isTodayDate && "bg-accent/50"
                )}
              >
                <span
                  className={cn(
                    "text-sm font-medium mb-1",
                    isTodayDate && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                  )}
                >
                  {format(date, 'd')}
                </span>
                {hasEvents && isCurrentMonth && (
                  <div className="absolute bottom-1 left-0 right-0 flex flex-col gap-0.5 items-center px-1 max-h-[50px] overflow-hidden">
                    {events.slice(0, 2).map((event, idx) => (
                      <div
                        key={idx}
                        className="w-full truncate text-[9px] px-1 py-0.5 rounded font-medium bg-primary/20 text-primary"
                        title={`${event.eventName} - ${event.clientName}`}
                      >
                        <span className="truncate block font-semibold">{event.eventName}</span>
                        <span className="truncate block text-[8px] opacity-75">{event.clientName}</span>
                      </div>
                    ))}
                    {events.length > 2 && (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4">
                        +{events.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function EventsCalendar() {
  const [eventsByDate, setEventsByDate] = useState<Map<string, EventDetail[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState<EventDetail[]>([]);

  // Get current month and next month
  const [baseMonth, setBaseMonth] = useState<Date>(() => startOfMonth(new Date()));
  const currentMonth = useMemo(() => baseMonth, [baseMonth]);
  const nextMonth = useMemo(() => addMonths(baseMonth, 1), [baseMonth]);

  // Fetch converted leads with events
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        // Fetch all converted leads
        const response = await getLeadsApi({
          status: 'converted',
          limit: 1000,
        });

        // Process events and group by date
        const eventsMap = new Map<string, EventDetail[]>();

        response.leads.forEach((lead: Lead) => {
          if (lead.typesOfEvent && lead.typesOfEvent.length > 0) {
            lead.typesOfEvent.forEach((event: TypeOfEvent) => {
              const eventDate = startOfDay(new Date(event.date));
              const dateKey = format(eventDate, 'yyyy-MM-dd');

              if (!eventsMap.has(dateKey)) {
                eventsMap.set(dateKey, []);
              }

              eventsMap.get(dateKey)!.push({
                eventName: event.name,
                clientName: lead.customer.name,
                dayNight: event.dayNight,
                leadId: lead._id,
              });
            });
          }
        });

        setEventsByDate(eventsMap);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleDateClick = (date: Date) => {
    const dateKey = format(startOfDay(date), 'yyyy-MM-dd');
    const events = eventsByDate.get(dateKey) || [];
    
    setSelectedDate(date);
    setSelectedDateEvents(events);
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Events Calendar
              </CardTitle>
              <CardDescription>
                View upcoming events from converted leads
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBaseMonth((m) => subMonths(m, 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBaseMonth(startOfMonth(new Date()))}
              >
                Today
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBaseMonth((m) => addMonths(m, 1))}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
              {/* Current Month */}
              <div className="w-full">
                <h3 className="text-lg font-semibold mb-4 text-center">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <CalendarGrid
                  month={currentMonth}
                  eventsByDate={eventsByDate}
                  onDateClick={handleDateClick}
                />
              </div>

              {/* Next Month */}
              <div className="w-full">
                <h3 className="text-lg font-semibold mb-4 text-center">
                  {format(nextMonth, 'MMMM yyyy')}
                </h3>
                <CalendarGrid
                  month={nextMonth}
                  eventsByDate={eventsByDate}
                  onDateClick={handleDateClick}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <EventDetailsDialog
        open={selectedDate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDate(null);
            setSelectedDateEvents([]);
          }
        }}
        date={selectedDate}
        events={selectedDateEvents}
      />
    </>
  );
}
