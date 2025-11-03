import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLeadStore } from "@/store/leadStore";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/admin/userStore";
import { useDistrictStore } from "@/store/districtStore";
import { useSourceStore } from "@/store/sourceStore";
import type { Lead, LeadData } from "@/lib/schema";
import { useEffect, useState, useMemo } from "react";
import { Loader } from "lucide-react";

const leadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobile: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
  location: z.string().min(1, "Location is required"),
  district: z.string().min(1, "District is required"),
  state: z.string().optional(),
  pinCode: z.number().optional(),
  source: z.string().min(1, "Source is required"),
  machineName: z.string().min(1, "Machine name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")).or(z.undefined()),
  description: z.string().optional(),
  status: z.enum(['new', 'details_sent', 'followup', 'not_interested', 'quotation_sent', 'deal_done', 'lost'] as const),
  assignedTo: z.string().optional(),
});

type LeadForm = z.infer<typeof leadSchema>;

interface LeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  mode: 'create' | 'edit';
}

export function LeadDialog({ open, onOpenChange, lead, mode }: LeadDialogProps) {
  const { createLead, updateLead, loading } = useLeadStore();
  const { user } = useAuthStore();
  const { users, fetchAllUsers, loading: usersLoading } = useUserStore();
  const { districts, fetchDistricts, loading: districtsLoading } = useDistrictStore();
  const { sources, fetchSources, loading: sourcesLoading } = useSourceStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter users to get only staff for assignment
  const staffMembers = useMemo(() => 
    users.filter(u => u.role === 'staff'), 
    [users]
  );

  // Memoize district and source options to prevent re-rendering
  const districtOptions = useMemo(() => 
    districts.map((district) => (
      <SelectItem key={district._id} value={district.name}>
        {district.name}
      </SelectItem>
    )), 
    [districts]
  );

  const sourceOptions = useMemo(() => 
    sources.map((source) => (
      <SelectItem key={source._id} value={source.name}>
        {source.name}
      </SelectItem>
    )), 
    [sources]
  );

  const form = useForm<LeadForm>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: lead?.name || "",
      mobile: lead?.mobile || "",
      location: lead?.location || "",
      district: lead?.district || "",
      state: lead?.state || "",
      pinCode: lead?.pinCode || undefined,
      source: lead?.source || "",
      machineName: lead?.machineName || "",
      email: lead?.email || "",
      description: lead?.description || "",
      status: lead?.status || 'new',
      assignedTo: lead?.assignedTo?._id || undefined,
    },
  });

  // Reset form when lead changes
  useEffect(() => {
    if (lead) {
      form.reset({
        name: lead.name || "",
        location: lead.location || "",
        district: lead.district || "",
        state: lead.state || "",
        pinCode: lead.pinCode || undefined,
        source: lead.source || "",
        email: lead.email || "",
        mobile: lead.mobile || "",
        machineName: lead.machineName || "",
        description: lead.description || "",
        status: lead.status || 'new',
        assignedTo: lead.assignedTo?._id || undefined,
      });
    } else {
      form.reset({
        name: "",
        location: "",
        district: "",
        state: "",
        pinCode: undefined,
        source: "",
        email: "",
        mobile: "",
        machineName: "",
        description: "",
        status: 'new',
        assignedTo: undefined,
      });
    }
  }, [lead, form]);

  // Fetch data when dialog opens
  useEffect(() => {
    if (open) {
      fetchAllUsers({ role: undefined, page: 1, limit: 100 }); // Fetch all users, then filter locally
      fetchDistricts(); // Fetch districts
      fetchSources(); // Fetch sources
    }
  }, [open, fetchAllUsers, fetchDistricts, fetchSources]);

  const onSubmit = async (data: LeadForm) => {
    if (!user) return;

    setIsSubmitting(true);
    
    try {
      // Prepare lead data according to backend schema
      const leadData: LeadData = {
        name: data.name,
        mobile: data.mobile,
        location: data.location,
        district: data.district,
        state: data.state || undefined,
        pinCode: data.pinCode || undefined,
        source: data.source,
        email: (data.email && data.email.trim() !== '') ? data.email : undefined,
        machineName: data.machineName,
        description: data.description || undefined,
        status: data.status,
        // For staff users, auto-assign to themselves; for admin, use the selected value
        ...(user.role === 'staff' 
          ? { assignedTo: user.id } 
          : data.assignedTo && { assignedTo: data.assignedTo }
        ),
      };

      if (mode === 'create') {
        const newLead = await createLead(leadData);
        if (newLead) {
          form.reset();
          onOpenChange(false);
        }
      } else if (mode === 'edit' && lead) {
        // Close dialog immediately to prevent any visual glitches
        onOpenChange(false);
        
        // Perform the update after closing
        const updatedLead = await updateLead(lead._id, leadData);
        if (!updatedLead) {
          // If update failed, we could reopen the dialog, but for now just log the error
          console.error('Failed to update lead');
        }
        
        setIsSubmitting(false);
        return; // Early return to prevent the finally block
      }
    } catch (error) {
      console.error('Error saving lead:', error);
    } finally {
      // Only set submitting to false if we didn't return early
      if (mode !== 'edit') {
        setIsSubmitting(false);
      }
    }
  };

  const isPending = loading || isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="lead-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{mode === 'create' ? 'Add New Lead' : 'Edit Lead'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="lead-form">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} data-testid="name-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@company.com"
                        {...field}
                        data-testid="email-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Mobile *</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 9876543210" {...field} data-testid="mobile-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Location *</FormLabel>
                    <FormControl>
                      <Input placeholder="Mumbai, Maharashtra" {...field} data-testid="location-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="district"
                render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>District *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="district-select">
                          <SelectValue placeholder={districtsLoading ? "Loading..." : "Select district"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent 
                        className="h-[200px] w-[var(--radix-select-trigger-width)] overflow-hidden" 
                        position="popper"
                        sideOffset={4}
                        avoidCollisions={true}
                        collisionPadding={8}
                        side="bottom"
                        align="start"
                      >
                        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300">
                          {districtOptions}
                        </div>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="machineName"
                render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Product Name etc." {...field} data-testid="machine-name-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="state"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="State" {...field} data-testid="state-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pinCode"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>PIN Code</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="PIN Code" 
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="pin-code-input" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className={`grid ${user?.role === 'admin' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'} gap-4`}>
              <FormField
                control={form.control}
                name="source"
                render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Source *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="source-select">
                          <SelectValue placeholder={sourcesLoading ? "Loading..." : "Select source"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent 
                        className="h-[200px] w-[var(--radix-select-trigger-width)] overflow-hidden" 
                        position="popper"
                        sideOffset={4}
                        avoidCollisions={true}
                        collisionPadding={8}
                        side="bottom"
                        align="start"
                      >
                        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300">
                          {sourceOptions}
                        </div>
                      </SelectContent>
                    </Select>
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
                    <FormControl>
                      <Input 
                        className="cursor-not-allowed w-[90px]"
                        value={field.value} 
                        readOnly
                        disabled
                        data-testid="status-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {user?.role === 'admin' && (
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Assign to Staff</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "unassigned" ? undefined : value)} value={field.value || "unassigned"}>
                        <FormControl>
                          <SelectTrigger data-testid="assigned-to-select">
                            <SelectValue placeholder={usersLoading ? "Loading..." : "Select staff member"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {staffMembers.map((staff) => (
                            <SelectItem key={staff._id} value={staff._id}>
                              {staff.name} ({staff.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about the lead, requirements, etc."
                      rows={3}
                      {...field}
                      data-testid="description-input"
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
                disabled={isPending}
                data-testid="cancel-button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="save-lead-button"
              >
                {isPending ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    {mode === 'create' ? "Creating..." : "Updating..."}
                  </>
                ) : (
                  mode === 'create' ? "Create Lead" : "Update Lead"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
