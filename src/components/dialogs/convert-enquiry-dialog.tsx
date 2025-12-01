import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { useEnquiryStore } from "@/store/enquiryStore";
import { useUserStore } from "@/store/admin/userStore";
import { useLeadStore } from "@/store/leadStore";
import { useAuthStore } from "@/store/authStore";
import { useBaraatConfigStore } from "@/store/baraatConfigStore";
import { useSfxConfigStore } from "@/store/sfxConfigStore";
import { Card } from "@/components/ui/card";
import type { Enquiry, ConvertEnquiryToLeadData } from "@/api/enquiryApi";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader, Plus, X } from "lucide-react";

// Convert enquiry form schema
// Note: name and numberOfGuests come from enquiry and are read-only
// Only date and dayNight are editable
const createConvertEnquirySchema = () => {
  return z.object({
    assignedTo: z.string().optional(),
    typesOfEvent: z.array(
      z.object({
        name: z.string().min(1, "Event name is required"), // Read-only from enquiry
        date: z.string().min(1, "Event date is required"), // Editable
        dayNight: z.enum(['day', 'night', 'both']), // Editable
        numberOfGuests: z.number().min(1, "Number of guests must be at least 1"), // Read-only from enquiry
      })
    ).min(1, "At least one event is required"), // Required - always have enquiry events
    sfx: z.array(
      z.object({
        name: z.string().min(1, "SFX name is required"),
        quantity: z.string().min(1, "Quantity is required"),
      })
    ).optional(),
    baraat: z.array(
      z.object({
        name: z.string().min(1, "Baraat name is required"),
        quantity: z.string().min(1, "Quantity is required"),
      })
    ).optional(),
  });
};

type ConvertEnquiryForm = z.infer<ReturnType<typeof createConvertEnquirySchema>>;

interface ConvertEnquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enquiry: Enquiry | null;
}

export function ConvertEnquiryDialog({ open, onOpenChange, enquiry }: ConvertEnquiryDialogProps) {
  const { convertEnquiryToLead, loading } = useEnquiryStore();
  const { users, fetchAllUsers } = useUserStore();
  const { fetchLeads } = useLeadStore();
  const { user } = useAuthStore();
  const { fields: baraatFields, fetchAllFields, loading: baraatFieldsLoading } = useBaraatConfigStore();
  const { sfxConfigs, fetchAllSfxConfigs, loading: sfxLoading } = useSfxConfigStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sort baraat fields by name
  const sortedBaraatFields = useMemo(() => {
    return [...baraatFields].sort((a, b) => a.name.localeCompare(b.name));
  }, [baraatFields]);

  // Filter users to get only staff for assignment
  const staffMembers = useMemo(() => 
    users.filter(u => u.role === 'staff'), 
    [users]
  );

  // Create schema
  const convertEnquirySchema = useMemo(() => createConvertEnquirySchema(), []);

  // Initialize form with default values - always use enquiry events
  const getDefaultValues = (): ConvertEnquiryForm => {
    if (enquiry && enquiry.typesOfEvent && enquiry.typesOfEvent.length > 0) {
      return {
        assignedTo: undefined,
        typesOfEvent: enquiry.typesOfEvent.map(event => ({
          name: event.name, // From enquiry - read-only
          date: new Date().toISOString().split('T')[0], // Default to today - editable
          dayNight: 'both' as const, // Default - editable
          numberOfGuests: event.numberOfGuests, // From enquiry - read-only
        })),
        sfx: undefined,
        baraat: undefined,
      };
    }
    // This shouldn't happen if enquiry has events, but handle gracefully
    return {
      assignedTo: undefined,
      typesOfEvent: [],
      sfx: undefined,
      baraat: undefined,
    };
  };

  const form = useForm<ConvertEnquiryForm>({
    resolver: zodResolver(convertEnquirySchema),
    defaultValues: getDefaultValues(),
  });

  // Reset form when enquiry changes
  useEffect(() => {
    if (open && enquiry) {
      form.reset(getDefaultValues());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enquiry?._id, open]);

  // Fetch data when dialog opens
  useEffect(() => {
    if (open) {
      fetchAllUsers({ role: undefined, page: 1, limit: 100 });
      fetchAllFields();
      fetchAllSfxConfigs();
    }
  }, [open, fetchAllUsers, fetchAllFields, fetchAllSfxConfigs]);

  const onSubmit = async (data: ConvertEnquiryForm) => {
    if (!enquiry) return;

    setIsSubmitting(true);
    
    try {
      // Prepare SFX data - convert array to map for backend
      const sfxData: Record<string, string | number | null> = {};
      if (data.sfx) {
        data.sfx.forEach((item) => {
          if (item.name && item.quantity) {
            sfxData[item.name] = item.quantity;
          }
        });
      }

      // Prepare baraat data - convert array to map for backend
      const baraatDetailsData: Record<string, string | number | null> = {};
      if (data.baraat) {
        data.baraat.forEach((item) => {
          if (item.name && item.quantity) {
            baraatDetailsData[item.name] = item.quantity;
          }
        });
      }

      // Always send typesOfEvent - they're required and come from enquiry
      // Backend will preserve enquiry's name and numberOfGuests, only use date/dayNight from form
      const convertData: ConvertEnquiryToLeadData = {
        assignedTo: data.assignedTo || undefined,
        typesOfEvent: data.typesOfEvent.map(event => ({
          name: event.name, // Backend will use enquiry's value, but we send it for matching
          date: new Date(event.date + 'T00:00:00').toISOString(),
          dayNight: event.dayNight,
          numberOfGuests: event.numberOfGuests, // Backend will use enquiry's value, but we send it for matching
        })),
        sfx: Object.keys(sfxData).length > 0 ? sfxData : undefined,
        baraatDetails: Object.keys(baraatDetailsData).length > 0 ? baraatDetailsData : undefined,
      };

      const lead = await convertEnquiryToLead(enquiry._id, convertData);
      
      if (lead) {
        toast({
          title: "Success",
          description: "Enquiry converted to lead successfully",
        });
        
        // Refresh leads list
        await fetchLeads({ page: 1, limit: 10 });
        
        // Navigate to the new lead based on user role
        const role = user?.role || 'admin';
        navigate(`/${role}/leads/${lead._id}`);
        
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error converting enquiry:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to convert enquiry to lead",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const typesOfEvent = form.watch("typesOfEvent") || [];

  // Note: We don't allow adding/removing events - they come from the enquiry
  // Users can only edit dates and day/night preferences

  const isPending = loading || isSubmitting || baraatFieldsLoading || sfxLoading;

  if (!enquiry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Convert Enquiry to Lead</DialogTitle>
          <DialogDescription>
            Convert this enquiry into a lead. You can assign it to a staff member, add event dates, and fill in baraat details.
          </DialogDescription>
        </DialogHeader>

        {(baraatFieldsLoading || sfxLoading) ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="animate-spin h-6 w-6" />
            <span className="ml-2">Loading form fields...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Customer Info Display */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Customer Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span> {enquiry.customer.name}
                </div>
                <div>
                  <span className="text-muted-foreground">Mobile:</span> {enquiry.customer.mobile}
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span> {enquiry.customer.email || 'N/A'}
                </div>
                <div>
                  <span className="text-muted-foreground">Address:</span> {enquiry.customer.address}
                </div>
              </div>
            </div>

            {/* Assignment */}
            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign To (Optional)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value || undefined)} 
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staffMembers.map((staff) => (
                        <SelectItem key={staff._id} value={staff._id}>
                          {staff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Types of Event with Dates */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Event Details</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Event names and guest counts are from the enquiry. Please add dates and day/night preferences.
                  </p>
                </div>
              </div>

              {typesOfEvent.map((_event, index) => (
                <div key={index} className="p-4 border rounded-lg bg-muted/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Event Name - Read-only from enquiry */}
                    <FormField
                      control={form.control}
                      name={`typesOfEvent.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Name</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              readOnly 
                              disabled
                              className="bg-background cursor-not-allowed"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Number of Guests - Read-only from enquiry */}
                    <FormField
                      control={form.control}
                      name={`typesOfEvent.${index}.numberOfGuests`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Guests</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              readOnly
                              disabled
                              className="bg-background cursor-not-allowed"
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Event Date - Editable */}
                    <FormField
                      control={form.control}
                      name={`typesOfEvent.${index}.date`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Date *</FormLabel>
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
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Day/Night - Editable */}
                    <FormField
                      control={form.control}
                      name={`typesOfEvent.${index}.dayNight`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Day/Night *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="day">Day</SelectItem>
                              <SelectItem value="night">Night</SelectItem>
                              <SelectItem value="both">Both</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* SFX Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">SFX (Special Effects)</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentSfx = form.getValues("sfx") || [];
                    form.setValue("sfx", [
                      ...currentSfx,
                      {
                        name: "",
                        quantity: "",
                      },
                    ]);
                  }}
                  disabled={isSubmitting || loading || sfxLoading}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add SFX
                </Button>
              </div>

              {form.watch("sfx")?.map((_sfx, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium text-sm">SFX {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const currentSfx = form.getValues("sfx") || [];
                        form.setValue(
                          "sfx",
                          currentSfx.filter((_, i) => i !== index)
                        );
                      }}
                      disabled={isSubmitting || loading}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* SFX Name - Dropdown from SFX Config */}
                    <FormField
                      control={form.control}
                      name={`sfx.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SFX Name *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                            disabled={isSubmitting || loading || sfxLoading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select SFX" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {sfxConfigs.map((sfxConfig) => (
                                <SelectItem key={sfxConfig._id} value={sfxConfig.name}>
                                  {sfxConfig.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Quantity */}
                    <FormField
                      control={form.control}
                      name={`sfx.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity *</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="Enter quantity"
                              {...field}
                              value={field.value || ""}
                              disabled={isSubmitting || loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
              ))}

              {(!form.watch("sfx") || form.watch("sfx")?.length === 0) && (
                <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                  No SFX added. Click "Add SFX" to add special effects.
                </div>
              )}
            </div>

            {/* Baraat Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Baraat</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentBaraat = form.getValues("baraat") || [];
                    form.setValue("baraat", [
                      ...currentBaraat,
                      {
                        name: "",
                        quantity: "",
                      },
                    ]);
                  }}
                  disabled={isSubmitting || loading || baraatFieldsLoading}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Baraat
                </Button>
              </div>

              {form.watch("baraat")?.map((_baraat, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium text-sm">Baraat {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const currentBaraat = form.getValues("baraat") || [];
                        form.setValue(
                          "baraat",
                          currentBaraat.filter((_, i) => i !== index)
                        );
                      }}
                      disabled={isSubmitting || loading}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Baraat Name - Dropdown from Baraat Config */}
                    <FormField
                      control={form.control}
                      name={`baraat.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Baraat Name *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                            disabled={isSubmitting || loading || baraatFieldsLoading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select baraat" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {sortedBaraatFields.map((baraatConfig) => (
                                <SelectItem key={baraatConfig._id} value={baraatConfig.name}>
                                  {baraatConfig.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Quantity */}
                    <FormField
                      control={form.control}
                      name={`baraat.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity *</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="Enter quantity"
                              {...field}
                              value={field.value || ""}
                              disabled={isSubmitting || loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
              ))}

              {(!form.watch("baraat") || form.watch("baraat")?.length === 0) && (
                <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                  No baraat added. Click "Add Baraat" to add baraat details.
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Converting..." : "Convert to Lead"}
              </Button>
            </div>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

