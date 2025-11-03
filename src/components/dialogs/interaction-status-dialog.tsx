import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Phone, Video, Calendar, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import type { Interaction } from '@/lib/schema';

interface InteractionStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interaction: Interaction | null;
  newStatus: 'completed' | 'missed';
  onConfirm: (interactionId: string, status: 'completed' | 'missed', notes: string) => Promise<void>;
}

export function InteractionStatusDialog({
  open,
  onOpenChange,
  interaction,
  newStatus,
  onConfirm
}: InteractionStatusDialogProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!notes.trim()) {
      toast({
        title: "Notes Required",
        description: `Please provide notes explaining why this ${interaction?.type} was ${newStatus}.`,
        variant: "destructive"
      });
      return;
    }

    if (!interaction) return;

    setIsSubmitting(true);
    try {
      await onConfirm(interaction._id, newStatus, notes.trim());
      toast({
        title: "Status Updated",
        description: `${interaction.type === 'call' ? 'Call' : 'Meeting'} marked as ${newStatus}.`
      });
      setNotes('');
      onOpenChange(false);
    } catch {
      toast({
        title: "Error",
        description: `Failed to update ${interaction.type} status. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNotes('');
    onOpenChange(false);
  };

  if (!interaction) return null;

  // Safe date extraction with fallback
  const getInteractionDate = () => {
    try {
      const dateValue = typeof interaction.date === 'object' && interaction.date?.iso 
        ? interaction.date.iso 
        : interaction.date;
      
      if (!dateValue) return new Date();
      
      const date = new Date(typeof dateValue === 'string' ? dateValue : dateValue.iso);
      return isNaN(date.getTime()) ? new Date() : date;
    } catch (error) {
      console.error('Error parsing interaction date:', error);
      return new Date();
    }
  };

  const interactionDate = getInteractionDate();
  const lead = typeof interaction.leadId === 'object' ? interaction.leadId : null;

  const statusColor = newStatus === 'completed' ? 'text-green-600' : 'text-red-600';
  const statusBg = newStatus === 'completed' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {interaction.type === 'call' ? <Phone className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            Mark {interaction.type === 'call' ? 'Call' : 'Meeting'} as {newStatus === 'completed' ? 'Completed' : 'Missed'}
          </DialogTitle>
        </DialogHeader>

        {/* Interaction Details */}
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border ${statusBg}`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{lead?.name || 'Unknown Lead'}</span>
                </div>
                <Badge variant="outline" className={statusColor}>
                  {newStatus === 'completed' ? 'Completed' : 'Missed'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(interactionDate, 'MMM dd, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{format(interactionDate, 'hh:mm a')}</span>
                </div>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Contact: </span>
                <span>
                  {lead?.mobile || 'No phone'} • {lead?.location || 'No location'}
                </span>
              </div>
            </div>
          </div>

          {/* Warning message */}
          

          {/* Notes Input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">
                Notes *
                <span className="text-muted-foreground text-sm ml-1">
                  (Required - explain why this {interaction.type} was {newStatus})
                </span>
              </Label>
              <Textarea
                id="notes"
                placeholder={
                  newStatus === 'completed'
                    ? `Describe what was discussed during this ${interaction.type}, key outcomes, next steps, etc.`
                    : `Explain why this ${interaction.type} was missed, any follow-up actions needed, etc.`
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                required
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters required. Be specific about outcomes and next steps.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || notes.trim().length < 10}
                className={newStatus === 'completed' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {isSubmitting 
                  ? "Updating..." 
                  : `Mark as ${newStatus === 'completed' ? 'Completed' : 'Missed'}`
                }
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}