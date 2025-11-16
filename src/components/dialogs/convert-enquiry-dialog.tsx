import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { useEnquiryStore } from "@/store/enquiryStore";
import { useUserStore } from "@/store/admin/userStore";
import { useLeadStore } from "@/store/leadStore";
import { useAuthStore } from "@/store/authStore";
import { useBaraatConfigStore } from "@/store/baraatConfigStore";
import type { Enquiry, ConvertEnquiryToLeadData } from "@/api/enquiryApi";
import type { BaraatFieldConfig } from "@/api/baraatConfigApi";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader } from "lucide-react";

// Dynamic baraat details schema - will be built based on active fields
const createBaraatDetailsSchema = (activeFields: BaraatFieldConfig[]) => {
  const baraatDetailsShape: Record<string, z.ZodTypeAny> = {};
  
  activeFields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny;
    
    switch (field.type) {
      case 'text':
        fieldSchema = z.string();
        break;
      case 'number':
        fieldSchema = z.number().or(z.string().transform((val) => {
          const num = Number(val);
          return isNaN(num) ? undefined : num;
        })).optional();
        break;
      case 'textarea':
        fieldSchema = z.string();
        break;
      case 'dropdown':
        fieldSchema = z.string();
        break;
      default:
        fieldSchema = z.string();
    }
    
    if (field.required) {
      if (field.type === 'number') {
        fieldSchema = z.number({ required_error: `${field.label} is required` });
      } else {
        fieldSchema = fieldSchema.min(1, `${field.label} is required`);
      }
    } else {
      fieldSchema = fieldSchema.optional().or(z.literal("")).or(z.null());
    }
    
    baraatDetailsShape[field.key] = fieldSchema;
  });
  
  return z.object(baraatDetailsShape).optional();
};

// Convert enquiry form schema
// Note: name and numberOfGuests come from enquiry and are read-only
// Only date and dayNight are editable
const createConvertEnquirySchema = (activeFields: BaraatFieldConfig[]) => {
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
    baraatDetails: createBaraatDetailsSchema(activeFields),
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
  const { activeFields, fetchActiveFields, loading: baraatFieldsLoading } = useBaraatConfigStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sort active fields by order
  const sortedActiveFields = useMemo(() => {
    return [...activeFields].sort((a, b) => a.order - b.order);
  }, [activeFields]);

  // Filter users to get only staff for assignment
  const staffMembers = useMemo(() => 
    users.filter(u => u.role === 'staff'), 
    [users]
  );

  // Create schema based on active fields
  const convertEnquirySchema = useMemo(() => createConvertEnquirySchema(sortedActiveFields), [sortedActiveFields]);

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
        baraatDetails: {},
      };
    }
    // This shouldn't happen if enquiry has events, but handle gracefully
    return {
      assignedTo: undefined,
      typesOfEvent: [],
      baraatDetails: {},
    };
  };

  const form = useForm<ConvertEnquiryForm>({
    resolver: zodResolver(convertEnquirySchema),
    defaultValues: getDefaultValues(),
  });

  // Reset form when enquiry changes or when fields are loaded
  useEffect(() => {
    if (open && sortedActiveFields.length >= 0) {
      // Only reset if we have an enquiry or if fields are loaded (to avoid resetting during initial load)
      const shouldReset = enquiry || sortedActiveFields.length > 0;
      if (shouldReset) {
        form.reset(getDefaultValues());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enquiry?._id, sortedActiveFields.length, open]);

  // Fetch data when dialog opens
  useEffect(() => {
    if (open) {
      fetchAllUsers({ role: undefined, page: 1, limit: 100 });
      fetchActiveFields();
    }
  }, [open, fetchAllUsers, fetchActiveFields]);

  const onSubmit = async (data: ConvertEnquiryForm) => {
    if (!enquiry) return;

    setIsSubmitting(true);
    
    try {
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
        baraatDetails: data.baraatDetails || undefined,
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

  // Render baraat field based on type
  const renderBaraatField = (field: BaraatFieldConfig) => {
    const fieldName = `baraatDetails.${field.key}` as const;
    
    switch (field.type) {
      case 'text':
        return (
          <FormField
            key={field._id}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label} {field.required && '*'}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    {...formField}
                    value={formField.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      case 'number':
        return (
          <FormField
            key={field._id}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label} {field.required && '*'}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    {...formField}
                    value={formField.value || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      formField.onChange(value ? Number(value) : undefined);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      case 'textarea':
        return (
          <FormField
            key={field._id}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label} {field.required && '*'}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    rows={3}
                    {...formField}
                    value={formField.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      case 'dropdown':
        return (
          <FormField
            key={field._id}
            control={form.control}
            name={fieldName}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label} {field.required && '*'}
                </FormLabel>
                <Select
                  onValueChange={formField.onChange}
                  value={formField.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {field.dropdownOptions?.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      default:
        return null;
    }
  };

  const isPending = loading || isSubmitting || baraatFieldsLoading;

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

        {baraatFieldsLoading ? (
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

              {typesOfEvent.map((event, index) => (
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

            {/* Baraat Details Section */}
            {sortedActiveFields.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Baraat Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sortedActiveFields.map((field) => renderBaraatField(field))}
                </div>
              </div>
            )}

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

