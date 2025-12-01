import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { assignLeadApi } from "@/api/leadApi";
import type { Lead } from "@/api/leadApi";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface AssignLeadDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly lead: Lead | null;
  readonly staffMembers: User[];
  readonly onSuccess?: () => void;
}

export function AssignLeadDialog({
  open,
  onOpenChange,
  lead,
  staffMembers,
  onSuccess,
}: AssignLeadDialogProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>("unassigned");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedStaffId(lead?.assignedTo?._id || "unassigned");
    } else {
      setSelectedStaffId("unassigned");
    }
  }, [open, lead]);

  const handleAssign = async () => {
    if (!lead || !selectedStaffId || selectedStaffId === "unassigned") return;

    setIsSubmitting(true);
    try {
      await assignLeadApi(lead._id, selectedStaffId);
      toast({
        title: "Success",
        description: "Lead assigned successfully",
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning lead:', error);
      toast({
        title: "Error",
        description: "Failed to assign lead",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassign = async () => {
    if (!lead) return;

    setIsSubmitting(true);
    try {
      await assignLeadApi(lead._id, null);
      toast({
        title: "Success",
        description: "Lead unassigned successfully",
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error unassigning lead:', error);
      toast({
        title: "Error",
        description: "Failed to unassign lead",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md min-h-[240px]">
        <DialogHeader>
          <DialogTitle>Assign Lead</DialogTitle>
          <DialogDescription>
            Assign "{lead.customer.name}" to a staff member or unassign them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff-select">Assign to Staff Member</Label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger id="staff-select">
                <SelectValue placeholder="Select a staff member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staffMembers?.map((staff) => (
                  <SelectItem key={staff._id} value={staff._id}>
                    {staff.name} ({staff.role})
                  </SelectItem>
                )) || []}
              </SelectContent>
            </Select>
          </div>

          {lead.assignedTo && (
            <div className="text-sm text-muted-foreground">
              Currently assigned to: <strong>{lead.assignedTo.name}</strong>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          {selectedStaffId === "unassigned" && lead.assignedTo && (
            <Button
              variant="destructive"
              onClick={handleUnassign}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? "Unassigning..." : "Unassign"}
            </Button>
          )}
          {selectedStaffId !== "unassigned" && (
            <Button
              onClick={handleAssign}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? "Assigning..." : "Assign"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}