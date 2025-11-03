import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchableLeadSelect } from "@/components/ui/searchable-lead-select";
import { CalendarIcon, Phone, Video, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useInteractionStore } from "@/store/interactionStore";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/hooks/use-toast";
import type { Interaction, InteractionType, CallStatus } from "@/lib/schema";

interface InteractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interaction?: Interaction | null;
  defaultType?: InteractionType;
  defaultLeadId?: string;
  rescheduleMode?: boolean; // New prop to indicate reschedule mode
}

export function InteractionDialog({
  open,
  onOpenChange,
  interaction,
  defaultType = "call",
  defaultLeadId,
  rescheduleMode = false
}: InteractionDialogProps) {
  const [type, setType] = useState<InteractionType>(defaultType);
  const [leadId, setLeadId] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [status, setStatus] = useState<CallStatus>("scheduled");
  const [initialNotes, setInitialNotes] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuthStore();
  const { createInteraction, updateInteraction } = useInteractionStore();
  const { toast } = useToast();

  // Initialize form with interaction data or defaults
  useEffect(() => {
    if (interaction && !rescheduleMode) {
      // Editing existing interaction
      setType(interaction.type);
      setLeadId(typeof interaction.leadId === 'object' ? interaction.leadId._id : interaction.leadId);
      
      const interactionDate = new Date(
        typeof interaction.date === 'object' ? interaction.date.iso : interaction.date
      );
      setDate(interactionDate);
      setTime(format(interactionDate, "HH:mm"));
      setStatus(interaction.status);
      setInitialNotes((interaction as any).initialNotes || "");
      setRemarks(interaction.remarks || "");
    } else {
      // Creating new interaction or reschedule mode
      setType(rescheduleMode && interaction ? interaction.type : "call");
      setLeadId(defaultLeadId || (rescheduleMode && interaction ? 
        (typeof interaction.leadId === 'object' ? interaction.leadId._id : interaction.leadId) : ""));
      setDate(new Date());
      setTime("10:00");
      setStatus("scheduled");
      setInitialNotes("");
      setRemarks("");
    }
  }, [interaction, defaultLeadId, rescheduleMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !leadId || !user || !initialNotes.trim()) return;

    setIsSubmitting(true);
    try {
      // Combine date and time
      const [hours, minutes] = time.split(':').map(Number);
      const combinedDateTime = new Date(date);
      combinedDateTime.setHours(hours, minutes, 0, 0);

      const interactionData = {
        leadId,
        staffId: user.id,
        type,
        status,
        date: combinedDateTime.toISOString(),
        initialNotes: initialNotes.trim(),
        // Only include remarks if status is not scheduled or if there are remarks
        remarks: (status !== "scheduled" && remarks.trim()) ? remarks.trim() : undefined,
      };

      if (interaction && !rescheduleMode) {
        // Update existing interaction
        const updated = await updateInteraction(interaction._id, interactionData);
        if (updated) {
          toast({
            title: "Success",
            description: `${type === 'call' ? 'Call' : 'Meeting'} updated successfully`,
          });
          onOpenChange(false);
        }
      } else {
        // Create new interaction (including reschedule mode)
        const created = await createInteraction(interactionData);
        if (created) {
          toast({
            title: "Success",
            description: rescheduleMode 
              ? `New ${type === 'call' ? 'call' : 'meeting'} rescheduled successfully`
              : `${type === 'call' ? 'Call' : 'Meeting'} scheduled successfully`,
          });
          onOpenChange(false);
        }
      }
    } catch {
      toast({
        title: "Error",
        description: `Failed to ${interaction && !rescheduleMode ? 'update' : 'create'} ${type === 'call' ? 'call' : 'meeting'}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCreatingNew = !interaction || rescheduleMode;
  const isScheduledStatus = isCreatingNew || status === "scheduled";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {rescheduleMode 
              ? `Reschedule ${type === 'call' ? 'Call' : 'Meeting'}` 
              : interaction 
                ? `Edit ${interaction.type === 'call' ? 'Call' : 'Meeting'}` 
                : `Schedule ${type === 'call' ? 'Call' : 'Meeting'}`
            }
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Selection */}
          <div className="space-y-2">
            <Label>Interaction Type</Label>
            <Select value={type} onValueChange={(value: InteractionType) => setType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Call
                  </div>
                </SelectItem>
                <SelectItem value="meeting">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Meeting
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lead Selection */}
          <div className="space-y-2">
            <Label>Lead *</Label>
            <SearchableLeadSelect 
              value={leadId} 
              onValueChange={setLeadId}
              placeholder="Search for a lead by name, location, or mobile..."
              disabled={rescheduleMode} // Disable if editing existing interaction
            />
          </div>

          {/* Date and Time Selection - Mobile Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Time *</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full"
              />
            </div>
          </div>

          {/* Status Selection - Only show for editing existing interactions */}
          {!isCreatingNew && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value: CallStatus) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Initial Notes Section - Always visible and required */}
          <div className="space-y-2">
            <Label>Initial Notes *</Label>
            <Textarea
              placeholder={
                type === 'call' 
                  ? "Agenda or preparation notes for this call - topics to discuss, questions to ask, information needed..."
                  : "Agenda or preparation notes for this meeting - meeting objectives, items to cover, materials to prepare..."
              }
              value={initialNotes}
              onChange={(e) => setInitialNotes(e.target.value)}
              rows={3}
              maxLength={500}
              required
            />
            <p className="text-xs text-muted-foreground">
              {initialNotes.length}/500 characters
            </p>
          </div>

          {/* Remarks Section - Only editable when status is completed/missed */}
          <div className="space-y-2">
            <Label>Remarks</Label>
            
            {/* Info message for scheduled status */}
            {isScheduledStatus && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium">Remarks can be added later</p>
                  <p>You can provide detailed remarks when marking this {type} as completed or missed.</p>
                </div>
              </div>
            )}
            
            {/* <Textarea
              placeholder={
                isScheduledStatus 
                  ? "Remarks will be added when marking as completed or missed..."
                  : type === 'call' 
                    ? "Document your discussion with the client - key points covered, client requirements, follow-up actions, next steps, and any commitments made during the call..."
                    : "Document your meeting with the client - agenda items discussed, decisions made, action items assigned, and follow-up requirements..."
              }
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              maxLength={500}
              disabled={isScheduledStatus}
              className={isScheduledStatus ? "bg-muted cursor-not-allowed" : ""}
            />
            
            {isScheduledStatus && (
              <p className="text-xs text-muted-foreground">
                Remarks are disabled for scheduled interactions. You can add detailed remarks when marking as completed or missed.
              </p>
            )} */}
            {!isScheduledStatus && (
              <p className="text-xs text-muted-foreground">
                {remarks.length}/500 characters
              </p>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !date || !time || !leadId || !initialNotes.trim()}>
              {isSubmitting 
                ? "Saving..." 
                : rescheduleMode
                  ? "Schedule New"
                  : interaction 
                    ? "Update" 
                    : "Schedule"
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}