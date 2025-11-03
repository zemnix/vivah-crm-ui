import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { useCreateMeeting, useLeads } from "@/hooks/useApi";
import { useAuthStore } from "@/store/authStore";
import type { Meeting } from "@/lib/schema";

interface MeetingForm {
  leadId: string;
  datetime: Date;
  locationType: 'online' | 'onsite';
  location?: string;
  notes?: string;
}

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
  meeting?: Meeting | null;
  mode?: 'create' | 'edit';
}

export function MeetingDialog({ 
  open, 
  onOpenChange, 
  leadId,
  meeting,
  mode = 'create'
}: MeetingDialogProps) {
  const { user } = useAuthStore();
  const { data: leads } = useLeads(user?.role === 'staff' ? user.id : undefined);
  const createMeeting = useCreateMeeting();

  const form = useForm<MeetingForm>({
    defaultValues: {
      leadId: leadId || meeting?.leadId || "",
      datetime: meeting ? new Date(meeting.datetime) : undefined,
      locationType: meeting?.locationType as 'online' | 'onsite' || 'online',
      location: meeting?.location || "",
      notes: meeting?.notes || "",
    },
  });

  const locationType = form.watch('locationType');

  const onSubmit = (data: MeetingForm) => {
    if (!user) return;

    const meetingData = {
      ...data,
      staffId: user.id,
    };

    createMeeting.mutate(meetingData);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="meeting-dialog">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Schedule Meeting' : 'Edit Meeting'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="meeting-form">
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
                          {lead.name} - {lead.email}
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
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        onDateChange={field.onChange}
                        placeholder="Select date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="datetime"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        value={field.value ? format(field.value, 'HH:mm') : ''}
                        onChange={(e) => {
                          if (field.value && e.target.value) {
                            const [hours, minutes] = e.target.value.split(':');
                            const newDate = new Date(field.value);
                            newDate.setHours(parseInt(hours), parseInt(minutes));
                            field.onChange(newDate);
                          }
                        }}
                        data-testid="time-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="locationType"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Meeting Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="location-type-select">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="online">Online Meeting</SelectItem>
                      <SelectItem value="onsite">On-site Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>
                    {locationType === 'online' ? 'Meeting Link' : 'Meeting Address'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        locationType === 'online'
                          ? "https://meet.google.com/..."
                          : "123 Main St, City, State"
                      }
                      {...field}
                      data-testid="location-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Meeting agenda, topics to discuss..."
                      {...field}
                      data-testid="notes-input"
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
                disabled={createMeeting.isPending}
                data-testid="save-meeting-button"
              >
                {createMeeting.isPending ? "Scheduling..." : "Schedule Meeting"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function format(date: Date, formatStr: string): string {
  if (formatStr === 'HH:mm') {
    return date.toTimeString().slice(0, 5);
  }
  return date.toISOString();
}
