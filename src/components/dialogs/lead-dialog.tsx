import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { Card } from "@/components/ui/card";
import { useLeadStore } from "@/store/leadStore";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/admin/userStore";
import { useBaraatConfigStore } from "@/store/baraatConfigStore";
import { useEventConfigStore } from "@/store/eventConfigStore";
import { useSfxConfigStore } from "@/store/sfxConfigStore";
import type { Lead, LeadCreateData, LeadUpdateData, LeadStatus } from "@/api/leadApi";
import type { BaraatFieldConfig, FieldType } from "@/api/baraatConfigApi";
import { useEffect, useState, useMemo } from "react";
import { Loader, Plus, X } from "lucide-react";

// Customer schema
const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")).or(z.undefined()),
  mobile: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
  dateOfBirth: z.string().min(1, "Date of birth is required"), // ISO date string
  whatsappNumber: z.string().regex(/^\d{10}$/, "WhatsApp number must be exactly 10 digits"),
  address: z.string().min(1, "Address is required"),
  venueEmail: z.string().email("Invalid email").optional().or(z.literal("")).or(z.undefined()),
});

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

// Lead form schema
const createLeadSchema = (activeFields: BaraatFieldConfig[]) => {
  return z.object({
    customer: customerSchema,
    status: z.enum(['new', 'follow_up', 'not_interested', 'quotation_sent', 'converted', 'lost'] as const),
    assignedTo: z.string().optional(),
    typesOfEvent: z.array(
      z.object({
        name: z.string().min(1, "Event name is required"),
        date: z.string().min(1, "Event date is required"),
        dayNight: z.enum(['day', 'night', 'both']),
        numberOfGuests: z.number().min(1, "Number of guests must be at least 1"),
      })
    ).optional(),
    sfx: z.array(
      z.object({
        name: z.string().min(1, "SFX name is required"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
      })
    ).optional(),
    baraatDetails: createBaraatDetailsSchema(activeFields),
  });
};

type LeadForm = z.infer<ReturnType<typeof createLeadSchema>>;

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
  const { activeFields, fetchActiveFields, loading: baraatFieldsLoading } = useBaraatConfigStore();
  const { events, fetchActiveEvents, loading: eventsLoading } = useEventConfigStore();
  const { sfxConfigs, fetchActiveSfxConfigs, loading: sfxLoading } = useSfxConfigStore();
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
  const leadSchema = useMemo(() => createLeadSchema(sortedActiveFields), [sortedActiveFields]);

  // Initialize form with default values
  const getDefaultValues = (): LeadForm => {
    if (lead) {
      // Convert ISO date string to Date object for DatePicker
      let dateOfBirthDate: Date | undefined = undefined;
      if (lead.customer?.dateOfBirth) {
        try {
          const date = new Date(lead.customer.dateOfBirth);
          if (!isNaN(date.getTime())) {
            dateOfBirthDate = date;
          }
        } catch (e) {
          // If date parsing fails, leave undefined
        }
      }

      // Convert typesOfEvent dates to YYYY-MM-DD format
      const typesOfEvent = lead.typesOfEvent?.map(event => {
        let eventDate = "";
        if (event.date) {
          try {
            const date = new Date(event.date);
            if (!isNaN(date.getTime())) {
              eventDate = date.toISOString().split('T')[0];
            }
          } catch (e) {
            // If date parsing fails, leave empty
          }
        }
        return {
          name: event.name || "",
          date: eventDate,
          dayNight: (event.dayNight || 'both') as 'day' | 'night' | 'both',
          numberOfGuests: event.numberOfGuests || 0,
        };
      }) || [];

      return {
        customer: {
          name: lead.customer?.name || "",
          email: lead.customer?.email || "",
          mobile: lead.customer?.mobile || "",
          dateOfBirth: dateOfBirthDate ? dateOfBirthDate.toISOString().split('T')[0] : "",
          whatsappNumber: lead.customer?.whatsappNumber || "",
          address: lead.customer?.address || "",
          venueEmail: lead.customer?.venueEmail || "",
        },
        status: lead.status || 'new',
        assignedTo: lead.assignedTo?._id || undefined,
        typesOfEvent: typesOfEvent.length > 0 ? typesOfEvent : undefined,
        sfx: lead.sfx?.length > 0 ? lead.sfx.map(s => ({ name: s.name, quantity: s.quantity })) : undefined,
        baraatDetails: lead.baraatDetails || {},
      };
    }
    return {
      customer: {
        name: "",
        email: "",
        mobile: "",
        dateOfBirth: "",
        whatsappNumber: "",
        address: "",
        venueEmail: "",
      },
      status: 'new',
      assignedTo: undefined,
      typesOfEvent: undefined,
      baraatDetails: {},
    };
  };

  const form = useForm<LeadForm>({
    resolver: zodResolver(leadSchema),
    defaultValues: getDefaultValues(),
  });

  // Reset form when lead changes or when fields are loaded
  useEffect(() => {
    if (open && sortedActiveFields.length >= 0) {
      // Only reset if we have a lead or if fields are loaded (to avoid resetting during initial load)
      const shouldReset = lead || sortedActiveFields.length > 0;
      if (shouldReset) {
        form.reset(getDefaultValues());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?._id, sortedActiveFields.length, open]);

  // Fetch data when dialog opens
  useEffect(() => {
    if (open) {
      fetchAllUsers({ role: undefined, page: 1, limit: 100 });
      fetchActiveFields();
      fetchActiveEvents(); // Only fetch active events for creating new leads
      fetchActiveSfxConfigs(); // Only fetch active SFX configs for creating new leads
    }
  }, [open, fetchAllUsers, fetchActiveFields, fetchActiveEvents, fetchActiveSfxConfigs]);

  const onSubmit = async (data: LeadForm) => {
    if (!user) return;

    setIsSubmitting(true);
    
    try {
      // Prepare customer data
      // Convert date input (YYYY-MM-DD) to ISO string
      let dateOfBirthISO = data.customer.dateOfBirth;
      if (dateOfBirthISO && dateOfBirthISO.includes('T') === false) {
        // If it's in YYYY-MM-DD format, convert to ISO
        const date = new Date(dateOfBirthISO + 'T00:00:00');
        if (!isNaN(date.getTime())) {
          dateOfBirthISO = date.toISOString();
        }
      }

      const customerData = {
        name: data.customer.name,
        mobile: data.customer.mobile,
        dateOfBirth: dateOfBirthISO,
        whatsappNumber: data.customer.whatsappNumber,
        address: data.customer.address,
        ...(data.customer.email && data.customer.email.trim() !== '' && { email: data.customer.email }),
        ...(data.customer.venueEmail && data.customer.venueEmail.trim() !== '' && { venueEmail: data.customer.venueEmail }),
      };

      // Prepare typesOfEvent - convert dates to ISO strings
      const typesOfEventData = data.typesOfEvent?.map(event => ({
        name: event.name,
        date: new Date(event.date + 'T00:00:00').toISOString(),
        dayNight: event.dayNight,
        numberOfGuests: event.numberOfGuests,
      }));

      // Prepare SFX data
      const sfxData = data.sfx?.filter(sfx => sfx.name && sfx.quantity > 0).map(sfx => ({
        name: sfx.name,
        quantity: sfx.quantity,
      }));

      // Prepare baraat details - filter out empty values and convert types
      const baraatDetailsData: Record<string, string | number | null> = {};
      if (data.baraatDetails) {
        sortedActiveFields.forEach((field) => {
          const value = data.baraatDetails?.[field.key];
          if (value !== undefined && value !== null && value !== '') {
            if (field.type === 'number') {
              const numValue = typeof value === 'number' ? value : Number(value);
              if (!isNaN(numValue)) {
                baraatDetailsData[field.key] = numValue;
              }
            } else {
              baraatDetailsData[field.key] = String(value);
            }
          } else if (field.required) {
            // For required fields, set to null if empty (backend will validate)
            baraatDetailsData[field.key] = null;
          }
        });
      }

      if (mode === 'create') {
        const leadData: LeadCreateData = {
          customer: customerData,
          typesOfEvent: typesOfEventData,
          sfx: sfxData && sfxData.length > 0 ? sfxData : undefined,
          baraatDetails: Object.keys(baraatDetailsData).length > 0 ? baraatDetailsData : undefined,
          status: data.status,
          ...(user.role === 'staff' 
            ? { assignedTo: user.id } 
            : data.assignedTo && { assignedTo: data.assignedTo }
          ),
        };

        const newLead = await createLead(leadData);
        if (newLead) {
          form.reset();
          onOpenChange(false);
        }
      } else if (mode === 'edit' && lead) {
        // Close dialog immediately to prevent any visual glitches
        onOpenChange(false);
        
        const updateData: LeadUpdateData = {
          customer: customerData,
          typesOfEvent: typesOfEventData,
          sfx: sfxData && sfxData.length > 0 ? sfxData : undefined,
          baraatDetails: Object.keys(baraatDetailsData).length > 0 ? baraatDetailsData : undefined,
          status: data.status,
          ...(user.role === 'staff' 
            ? {} 
            : data.assignedTo !== undefined && { assignedTo: data.assignedTo }
          ),
        };

        // Perform the update after closing
        const updatedLead = await updateLead(lead._id, updateData);
        if (!updatedLead) {
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

  const isPending = loading || isSubmitting || baraatFieldsLoading || eventsLoading;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="lead-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{mode === 'create' ? 'Add New Lead' : 'Edit Lead'}</DialogTitle>
        </DialogHeader>

        {baraatFieldsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="animate-spin h-6 w-6" />
            <span className="ml-2">Loading form fields...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="lead-form">
              {/* Customer Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Customer Information</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customer.name"
                    render={({ field }) => (
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
                    name="customer.email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john@example.com"
                            {...field}
                            value={field.value || ''}
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
                    name="customer.mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile *</FormLabel>
                        <FormControl>
                          <Input placeholder="9876543210" {...field} data-testid="mobile-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customer.whatsappNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="9876543210" {...field} data-testid="whatsapp-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customer.dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth *</FormLabel>
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
                            data-testid="dob-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customer.venueEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Venue Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="venue@example.com"
                            {...field}
                            value={field.value || ''}
                            data-testid="venue-email-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="customer.address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter full address"
                          rows={2}
                          {...field}
                          data-testid="address-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Event Details Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Event Details</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentEvents = form.getValues("typesOfEvent") || [];
                      form.setValue("typesOfEvent", [
                        ...currentEvents,
                        {
                          name: "",
                          date: new Date().toISOString().split('T')[0],
                          dayNight: 'both' as const,
                          numberOfGuests: 0,
                        },
                      ]);
                    }}
                    disabled={isSubmitting || loading || eventsLoading}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Event
                  </Button>
                </div>

                {form.watch("typesOfEvent")?.map((event, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-medium text-sm">Event {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const currentEvents = form.getValues("typesOfEvent") || [];
                          form.setValue(
                            "typesOfEvent",
                            currentEvents.filter((_, i) => i !== index)
                          );
                        }}
                        disabled={isSubmitting || loading}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Event Name - Dropdown from Event Config */}
                      <FormField
                        control={form.control}
                        name={`typesOfEvent.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Event Name *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || ""}
                              disabled={isSubmitting || loading || eventsLoading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select event type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {events.map((eventConfig) => (
                                  <SelectItem key={eventConfig._id} value={eventConfig.name}>
                                    {eventConfig.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Event Date */}
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
                                disabled={isSubmitting || loading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Day/Night */}
                      <FormField
                        control={form.control}
                        name={`typesOfEvent.${index}.dayNight`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Day/Night *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || "both"}
                              disabled={isSubmitting || loading}
                            >
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

                      {/* Number of Guests */}
                      <FormField
                        control={form.control}
                        name={`typesOfEvent.${index}.numberOfGuests`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Guests *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Enter number of guests"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value ? Number(value) : 0);
                                }}
                                disabled={isSubmitting || loading}
                                min="1"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </Card>
                ))}

                {(!form.watch("typesOfEvent") || form.watch("typesOfEvent")?.length === 0) && (
                  <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-lg">
                    No events added. Click "Add Event" to add an event.
                  </div>
                )}
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
                          quantity: 1,
                        },
                      ]);
                    }}
                    disabled={isSubmitting || loading || sfxLoading}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add SFX
                  </Button>
                </div>

                {form.watch("sfx")?.map((sfx, index) => (
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
                                type="number"
                                placeholder="Enter quantity"
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
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

              {/* Baraat Details Section */}
              {sortedActiveFields.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Baraat Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sortedActiveFields.map((field) => renderBaraatField(field))}
                  </div>
                </div>
              )}

              {/* Status and Assignment Section */}
              <div className={`grid ${user?.role === 'admin' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-4`}>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="follow_up">Follow Up</SelectItem>
                            <SelectItem value="not_interested">Not Interested</SelectItem>
                            <SelectItem value="quotation_sent">Quotation Sent</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {user?.role === 'admin' && (
                  <FormField
                    control={form.control}
                    name="assignedTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Staff</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value === "unassigned" ? undefined : value)}
                          value={field.value || "unassigned"}
                        >
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
                      <Loader className="animate-spin mr-2" size={16} />
                      {mode === 'create' ? "Creating..." : "Updating..."}
                    </>
                  ) : (
                    mode === 'create' ? "Create Lead" : "Update Lead"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
