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
import type { Lead, LeadUpdateData, LeadStatus } from "@/api/leadApi";
import type { BaraatFieldConfig } from "@/api/baraatConfigApi";
import { useEffect, useState, useMemo } from "react";
import { Loader, AlertCircle, Plus, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Customer schema
const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")).or(z.undefined()),
  mobile: z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  whatsappNumber: z.string().regex(/^\d{10}$/, "WhatsApp number must be exactly 10 digits"),
  address: z.string().min(1, "Address is required"),
  venueEmail: z.string().email("Invalid email").optional().or(z.literal("")).or(z.undefined()),
});

// Dynamic baraat details schema - includes all fields (active + inactive) and legacy fields
const createBaraatDetailsSchema = (
  allFields: BaraatFieldConfig[],
  legacyFields: Array<{ key: string; value: any }>
) => {
  const baraatDetailsShape: Record<string, z.ZodTypeAny> = {};
  
  // Add all config fields (active + inactive)
  allFields.forEach((field) => {
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
  
  // Add legacy fields as optional strings/numbers
  legacyFields.forEach(({ key, value }) => {
    if (!baraatDetailsShape[key]) {
      // Try to infer type from existing value
      if (typeof value === 'number') {
        baraatDetailsShape[key] = z.number().optional().or(z.string().transform((val) => {
          const num = Number(val);
          return isNaN(num) ? undefined : num;
        })).optional();
      } else {
        baraatDetailsShape[key] = z.string().optional().or(z.literal("")).or(z.null());
      }
    }
  });
  
  return z.object(baraatDetailsShape).optional();
};

// Lead form schema for editing
const createLeadEditSchema = (
  allFields: BaraatFieldConfig[],
  legacyFields: Array<{ key: string; value: any }>
) => {
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
    baraatDetails: createBaraatDetailsSchema(allFields, legacyFields),
  });
};

type LeadEditForm = z.infer<ReturnType<typeof createLeadEditSchema>>;

interface LeadEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
}

export function LeadEditDialog({ open, onOpenChange, lead }: LeadEditDialogProps) {
  const { updateLead, loading } = useLeadStore();
  const { user } = useAuthStore();
  const { users, fetchAllUsers, loading: usersLoading } = useUserStore();
  const { fields: allFields, fetchAllFields, loading: baraatFieldsLoading } = useBaraatConfigStore();
  const { events, fetchAllEvents, loading: eventsLoading } = useEventConfigStore();
  const { sfxConfigs, fetchAllSfxConfigs, loading: sfxLoading } = useSfxConfigStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detect legacy fields (fields in lead.baraatDetails that are not in config)
  const legacyFields = useMemo(() => {
    if (!lead?.baraatDetails) return [];
    
    const configFieldKeys = new Set(allFields.map(f => f.key));
    const legacy: Array<{ key: string; value: any }> = [];
    
    Object.entries(lead.baraatDetails).forEach(([key, value]) => {
      if (!configFieldKeys.has(key)) {
        legacy.push({ key, value });
      }
    });
    
    return legacy;
  }, [lead?.baraatDetails, allFields]);

  // Get fields that the lead has (active + inactive from config)
  // For editing, we show all config fields (active + inactive) that exist in the lead's data
  const leadFields = useMemo(() => {
    if (!lead?.baraatDetails) return [];
    
    const leadFieldKeys = new Set(Object.keys(lead.baraatDetails));
    return allFields.filter(field => leadFieldKeys.has(field.key));
  }, [lead?.baraatDetails, allFields]);

  // Sort fields by order
  const sortedLeadFields = useMemo(() => {
    return [...leadFields].sort((a, b) => a.order - b.order);
  }, [leadFields]);

  // Combine events from config with event names from lead that aren't in config
  const availableEvents = useMemo(() => {
    const eventNamesFromConfig = new Set(events.map(e => e.name));
    const eventNamesFromLead = lead?.typesOfEvent?.map(e => e.name) || [];
    
    // Find event names in lead that aren't in config
    const missingEventNames = eventNamesFromLead.filter(name => 
      name && !eventNamesFromConfig.has(name)
    );
    
    // Create a combined list: config events + missing event names
    const combinedEvents = [
      ...events,
      ...missingEventNames.map(name => ({
        _id: `legacy-${name}`, // Temporary ID for legacy events
        name: name,
        description: '', // Not needed for display
        isActive: false,
        createdAt: '',
        updatedAt: ''
      }))
    ];
    
    return combinedEvents;
  }, [events, lead?.typesOfEvent]);

  // Combine SFX configs with SFX names from lead that aren't in config
  const availableSfxConfigs = useMemo(() => {
    const sfxNamesFromConfig = new Set(sfxConfigs.map(s => s.name));
    const sfxNamesFromLead = lead?.sfx?.map(s => s.name) || [];
    
    // Find SFX names in lead that aren't in config
    const missingSfxNames = sfxNamesFromLead.filter(name => 
      name && !sfxNamesFromConfig.has(name)
    );
    
    // Create a combined list: config SFX + missing SFX names
    const combinedSfx = [
      ...sfxConfigs,
      ...missingSfxNames.map(name => ({
        _id: `legacy-${name}`, // Temporary ID for legacy SFX
        name: name,
        quantity: 1, // Default quantity
        isActive: false,
        createdAt: '',
        updatedAt: ''
      }))
    ];
    
    return combinedSfx;
  }, [sfxConfigs, lead?.sfx]);

  // Filter users to get only staff for assignment
  const staffMembers = useMemo(() => 
    users.filter(u => u.role === 'staff'), 
    [users]
  );

  // Create schema based on all fields (active + inactive) and legacy fields
  const leadSchema = useMemo(() => 
    createLeadEditSchema(allFields, legacyFields), 
    [allFields, legacyFields]
  );

  // Initialize form with default values
  const getDefaultValues = (): LeadEditForm => {
    if (lead) {
      // Convert ISO date string to YYYY-MM-DD format for date input
      let dateOfBirthInput = "";
      if (lead.customer?.dateOfBirth) {
        try {
          const date = new Date(lead.customer.dateOfBirth);
          if (!isNaN(date.getTime())) {
            dateOfBirthInput = date.toISOString().split('T')[0];
          }
        } catch (e) {
          // If date parsing fails, leave empty
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
          dateOfBirth: dateOfBirthInput,
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

  const form = useForm<LeadEditForm>({
    resolver: zodResolver(leadSchema),
    defaultValues: getDefaultValues(),
  });

  // Reset form when lead changes or when fields are loaded
  useEffect(() => {
    if (open && allFields.length >= 0) {
      const shouldReset = lead || allFields.length > 0;
      if (shouldReset) {
        form.reset(getDefaultValues());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?._id, allFields.length, open]);

  // Fetch data when dialog opens
  useEffect(() => {
    if (open) {
      fetchAllUsers({ role: undefined, page: 1, limit: 100 });
      fetchAllFields(); // Fetch all fields (active + inactive) for editing
      fetchAllEvents(); // Include inactive events so existing leads can display their events
      fetchAllSfxConfigs(); // Include inactive SFX configs so existing leads can display their SFX
    }
  }, [open, fetchAllUsers, fetchAllFields, fetchAllEvents, fetchAllSfxConfigs]);

  const onSubmit = async (data: LeadEditForm) => {
    if (!user || !lead) return;

    setIsSubmitting(true);
    
    try {
      // Prepare customer data
      let dateOfBirthISO = data.customer.dateOfBirth;
      if (dateOfBirthISO && dateOfBirthISO.includes('T') === false) {
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

      // Prepare baraat details - include all fields (config + legacy)
      const baraatDetailsData: Record<string, string | number | null> = {};
      if (data.baraatDetails) {
        // Add all config fields
        allFields.forEach((field) => {
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
            baraatDetailsData[field.key] = null;
          }
        });
        
        // Add legacy fields
        legacyFields.forEach(({ key }) => {
          const value = data.baraatDetails?.[key];
          if (value !== undefined && value !== null && value !== '') {
            // Try to preserve type
            if (typeof value === 'number') {
              baraatDetailsData[key] = value;
            } else {
              const numValue = Number(value);
              if (!isNaN(numValue) && value !== '') {
                baraatDetailsData[key] = numValue;
              } else {
                baraatDetailsData[key] = String(value);
              }
            }
          }
        });
      }

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
      return;
    } catch (error) {
      console.error('Error updating lead:', error);
    } finally {
      if (!isSubmitting) {
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
                  {!field.isActive && (
                    <span className="ml-2 text-xs text-muted-foreground">(Inactive)</span>
                  )}
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
                  {!field.isActive && (
                    <span className="ml-2 text-xs text-muted-foreground">(Inactive)</span>
                  )}
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
                  {!field.isActive && (
                    <span className="ml-2 text-xs text-muted-foreground">(Inactive)</span>
                  )}
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
                  {!field.isActive && (
                    <span className="ml-2 text-xs text-muted-foreground">(Inactive)</span>
                  )}
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

  // Render legacy field (simple text input)
  const renderLegacyField = (legacyField: { key: string; value: any }) => {
    const fieldName = `baraatDetails.${legacyField.key}` as const;
    const isNumber = typeof legacyField.value === 'number';
    
    return (
      <FormField
        key={legacyField.key}
        control={form.control}
        name={fieldName}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel className="text-amber-600 dark:text-amber-500">
              {legacyField.key} <span className="text-xs text-muted-foreground">(Legacy)</span>
            </FormLabel>
            <FormControl>
              {isNumber ? (
                <Input
                  type="number"
                  placeholder={`Enter ${legacyField.key}`}
                  {...formField}
                  value={formField.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    formField.onChange(value ? Number(value) : undefined);
                  }}
                />
              ) : (
                <Input
                  placeholder={`Enter ${legacyField.key}`}
                  {...formField}
                  value={formField.value || ''}
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  if (!lead) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="lead-edit-dialog">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Edit Lead</DialogTitle>
        </DialogHeader>

        {baraatFieldsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="animate-spin h-6 w-6" />
            <span className="ml-2">Loading form fields...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="lead-edit-form">
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
                                {availableEvents.map((eventConfig) => (
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
                                {availableSfxConfigs.map((sfxConfig) => (
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

              {/* Baraat Details Section - Config Fields */}
              {sortedLeadFields.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Baraat Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sortedLeadFields.map((field) => renderBaraatField(field))}
                  </div>
                </div>
              )}

              {/* Legacy Fields Section */}
              {legacyFields.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Legacy Fields</h3>
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                  </div>
                  <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                    <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                      These fields are not in the current configuration but exist in this lead's data. You can edit them freely.
                    </AlertDescription>
                  </Alert>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {legacyFields.map((legacyField) => renderLegacyField(legacyField))}
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
                  data-testid="update-lead-button"
                >
                  {isPending ? (
                    <>
                      <Loader className="animate-spin mr-2" size={16} />
                      Updating...
                    </>
                  ) : (
                    "Update Lead"
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

