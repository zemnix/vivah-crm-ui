import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { useCreateCall, useLeads } from "@/hooks/useApi";
import { useAuthStore } from "@/store/authStore";
import { Play, Square } from "lucide-react";

interface CallForm {
  leadId: string;
  datetime: string;
  status: 'completed' | 'missed' | 'scheduled';
  durationSec?: number;
  notes?: string;
  nextActionDate?: string;
}

interface CallDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly leadId?: string;
}

export function CallDialog({ open, onOpenChange, leadId }: CallDialogProps) {
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState<Date | null>(null);
  const [duration, setDuration] = useState(0);

  const { user } = useAuthStore();
  const { data: leads } = useLeads(user?.role === 'staff' ? user.id : undefined);
  const createCall = useCreateCall();

  const form = useForm<CallForm>({
    defaultValues: {
      leadId: leadId || "",
      datetime: new Date().toISOString().slice(0, 16),
      status: 'completed',
      notes: "",
      nextActionDate: "",
    },
  });

  const startTimer = () => {
    setIsTimerRunning(true);
    setTimerStart(new Date());
    setDuration(0);
    
    const interval = setInterval(() => {
      if (timerStart) {
        const elapsed = Math.floor((Date.now() - timerStart.getTime()) / 1000);
        setDuration(elapsed);
      }
    }, 1000);

    return () => clearInterval(interval);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    form.setValue('durationSec', duration);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const onSubmit = (data: CallForm) => {
    if (!user) return;

    const callData = {
      ...data,
      staffId: user.id,
      datetime: new Date(data.datetime),
      nextActionDate: data.nextActionDate ? new Date(data.nextActionDate) : undefined,
    };

    console.log('Creating call:', callData);
    // TODO: Implement call creation
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="call-dialog">
        <DialogHeader>
          <DialogTitle>Log Call</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="call-form">
            <FormField
              control={form.control}
              name="leadId"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Lead</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="lead-select">
                        <SelectValue placeholder="Select a lead" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {leads?.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.name} 
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="datetime"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} data-testid="datetime-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="status-select">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="missed">Missed</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Timer Section */}
            <div className="space-y-2">
              <FormLabel>Call Timer</FormLabel>
              <div className="flex items-center space-x-4">
                <div className="text-2xl font-mono bg-muted px-4 py-2 rounded-md">
                  {formatDuration(duration)}
                </div>
                <Button
                  type="button"
                  variant={isTimerRunning ? "destructive" : "default"}
                  size="sm"
                  onClick={isTimerRunning ? stopTimer : startTimer}
                  data-testid="timer-button"
                >
                  {isTimerRunning ? (
                    <>
                      <Square className="h-4 w-4 mr-2" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </>
                  )}
                </Button>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Call summary and key points..."
                      {...field}
                      data-testid="notes-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nextActionDate"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Next Follow-up Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      date={field.value ? new Date(field.value + 'T00:00:00') : undefined}
                      onDateChange={(date) => {
                        // Convert Date to YYYY-MM-DD string format
                        if (date) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          field.onChange(`${year}-${month}-${day}`);
                        } else {
                          field.onChange("");
                        }
                      }}
                      placeholder="Pick a date"
                      data-testid="next-action-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="cancel-button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCall.isPending}
                data-testid="save-call-button"
              >
                {createCall.isPending ? "Saving..." : "Save Call"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
