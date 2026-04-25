import { useEffect, useState } from "react";
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
import { assignLeadApi, bulkAssignLeadsApi } from "@/api/leadApi";
import type { Lead } from "@/api/leadApi";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface AssignLeadDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly leads: Lead[];
  readonly staffMembers: User[];
  readonly onSuccess?: () => void;
}

export function AssignLeadDialog({
  open,
  onOpenChange,
  leads,
  staffMembers,
  onSuccess,
}: AssignLeadDialogProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>("unassigned");
  const [selectedSharedStaffIds, setSelectedSharedStaffIds] = useState<string[]>([]);
  const [sharedAssignmentAction, setSharedAssignmentAction] = useState<"add" | "replace">("add");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const isBulkMode = leads.length > 1;
  const primaryLead = leads[0] || null;

  useEffect(() => {
    if (!open) {
      setSelectedStaffId("unassigned");
      setSelectedSharedStaffIds([]);
      setSharedAssignmentAction("add");
      return;
    }

    if (isBulkMode) {
      setSelectedStaffId("keep-current");
      setSelectedSharedStaffIds([]);
      setSharedAssignmentAction("add");
      return;
    }

    setSelectedStaffId(primaryLead?.assignedTo?._id || "unassigned");
    setSelectedSharedStaffIds(primaryLead?.additionalAssignees?.map((staff) => staff._id) || []);
    setSharedAssignmentAction("replace");
  }, [open, isBulkMode, primaryLead]);

  useEffect(() => {
    if (!selectedStaffId || selectedStaffId === "unassigned" || selectedStaffId === "keep-current") {
      return;
    }

    setSelectedSharedStaffIds((current) => current.filter((staffId) => staffId !== selectedStaffId));
  }, [selectedStaffId]);

  const toggleSharedStaff = (staffId: string, checked: boolean) => {
    setSelectedSharedStaffIds((current) => {
      if (checked) {
        return [...new Set([...current, staffId])];
      }

      return current.filter((id) => id !== staffId);
    });
  };

  const handleAssign = async () => {
    if (leads.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (isBulkMode) {
        const payload: {
          leadIds: string[];
          assignedTo?: string | null;
          additionalAssignees?: string[];
          sharedAssignmentAction?: "add" | "replace";
        } = {
          leadIds: leads.map((lead) => lead._id),
        };

        if (selectedStaffId !== "keep-current") {
          payload.assignedTo = selectedStaffId === "unassigned" ? null : selectedStaffId;
        }

        if (selectedSharedStaffIds.length > 0) {
          payload.additionalAssignees = selectedSharedStaffIds;
          payload.sharedAssignmentAction = sharedAssignmentAction;
        }

        if (!("assignedTo" in payload) && !("additionalAssignees" in payload)) {
          toast({
            title: "No Changes Selected",
            description: "Choose a primary owner and/or shared staff before saving.",
            variant: "destructive",
          });
          return;
        }

        const result = await bulkAssignLeadsApi(payload);
        toast({
          title: "Success",
          description: `${result.updatedCount} lead${result.updatedCount === 1 ? "" : "s"} updated successfully`,
        });
      } else if (primaryLead) {
        await assignLeadApi(primaryLead._id, {
          assignedTo: selectedStaffId === "unassigned" ? null : selectedStaffId,
          additionalAssignees: selectedSharedStaffIds,
        });
        toast({
          title: "Success",
          description: "Lead assignment updated successfully",
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating lead assignment:", error);
      toast({
        title: "Error",
        description: "Failed to update lead assignment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (leads.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isBulkMode ? "Assign Selected Leads" : "Manage Lead Assignment"}</DialogTitle>
          <DialogDescription>
            {isBulkMode
              ? `Apply the same assignment changes to ${leads.length} selected leads.`
              : `Set the primary owner and shared staff access for "${primaryLead?.customer.name}".`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isBulkMode && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{leads.length} leads selected</Badge>
              {leads.slice(0, 3).map((lead) => (
                <Badge key={lead._id} variant="outline">
                  {lead.customer.name}
                </Badge>
              ))}
              {leads.length > 3 && (
                <Badge variant="outline">+{leads.length - 3} more</Badge>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="staff-select">Primary Owner</Label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger id="staff-select">
                <SelectValue placeholder="Select a primary owner" />
              </SelectTrigger>
              <SelectContent>
                {isBulkMode && <SelectItem value="keep-current">Keep current primary owner</SelectItem>}
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staffMembers.map((staff) => (
                  <SelectItem key={staff._id} value={staff._id}>
                    {staff.name} ({staff.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label>Shared Staff Access</Label>
              {isBulkMode && (
                <Select
                  value={sharedAssignmentAction}
                  onValueChange={(value: "add" | "replace") => setSharedAssignmentAction(value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add to current shared staff</SelectItem>
                    <SelectItem value="replace">Replace shared staff</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
              {staffMembers.map((staff) => {
                const isPrimaryOwner = selectedStaffId !== "keep-current" && selectedStaffId === staff._id;

                return (
                  <label
                    key={staff._id}
                    className={`flex items-start gap-3 rounded-md px-2 py-2 ${isPrimaryOwner ? "opacity-60" : "cursor-pointer hover:bg-muted/50"}`}
                  >
                    <Checkbox
                      checked={selectedSharedStaffIds.includes(staff._id)}
                      disabled={isPrimaryOwner}
                      onCheckedChange={(checked) => toggleSharedStaff(staff._id, Boolean(checked))}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{staff.name}</div>
                      <div className="text-xs text-muted-foreground">{staff.email}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {!isBulkMode && primaryLead && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              <div>
                Current primary owner: <strong>{primaryLead.assignedTo?.name || "Unassigned"}</strong>
              </div>
              <div className="mt-1">
                Shared with:{" "}
                <strong>
                  {primaryLead.additionalAssignees?.map((staff) => staff.name).join(", ") || "No shared staff"}
                </strong>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Saving..." : isBulkMode ? "Apply to Selected Leads" : "Save Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
