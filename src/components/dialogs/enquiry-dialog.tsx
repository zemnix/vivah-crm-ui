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
import { useEnquiryStore } from "@/store/enquiryStore";
import { useEventConfigStore } from "@/store/eventConfigStore";
import type { Enquiry, EnquiryCreateData, EnquiryUpdateData } from "@/api/enquiryApi";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

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

// Enquiry form schema
const enquirySchema = z.object({
  customer: customerSchema,
  typesOfEvent: z.array(
    z.object({
      name: z.string().min(1, "Event name is required"),
      numberOfGuests: z.number().min(1, "Number of guests must be at least 1"),
    })
  ).min(1, "At least one event type is required"),
});

type EnquiryForm = z.infer<typeof enquirySchema>;

interface EnquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enquiry?: Enquiry | null;
  mode: 'create' | 'edit';
}

export function EnquiryDialog({ open, onOpenChange, enquiry, mode }: EnquiryDialogProps) {
  const { createEnquiry, updateEnquiry, loading } = useEnquiryStore();
  const { events, fetchActiveEvents, loading: eventsLoading } = useEventConfigStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values
  const getDefaultValues = (): EnquiryForm => {
    if (enquiry) {
      // Convert ISO date string to YYYY-MM-DD format for date input
      let dateOfBirthInput = "";
      if (enquiry.customer?.dateOfBirth) {
        try {
          const date = new Date(enquiry.customer.dateOfBirth);
          if (!isNaN(date.getTime())) {
            dateOfBirthInput = date.toISOString().split('T')[0];
          }
        } catch (e) {
          // If date parsing fails, leave empty
        }
      }

      return {
        customer: {
          name: enquiry.customer?.name || "",
          email: enquiry.customer?.email || "",
          mobile: enquiry.customer?.mobile || "",
          dateOfBirth: dateOfBirthInput,
          whatsappNumber: enquiry.customer?.whatsappNumber || "",
          address: enquiry.customer?.address || "",
          venueEmail: enquiry.customer?.venueEmail || "",
        },
        typesOfEvent: enquiry.typesOfEvent?.length > 0 
          ? enquiry.typesOfEvent.map(event => ({
              name: event.name,
              numberOfGuests: event.numberOfGuests,
            }))
          : [{ name: "", numberOfGuests: 0 }],
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
      typesOfEvent: [{ name: "", numberOfGuests: 0 }],
    };
  };

  const form = useForm<EnquiryForm>({
    resolver: zodResolver(enquirySchema),
    defaultValues: getDefaultValues(),
  });

  // Reset form when enquiry changes
  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enquiry?._id, open]);

  // Fetch event configs when dialog opens
  useEffect(() => {
    if (open) {
      fetchActiveEvents(); // Only fetch active events for creating new enquiries
    }
  }, [open, fetchActiveEvents]);

  const onSubmit = async (data: EnquiryForm) => {
    setIsSubmitting(true);
    
    try {
      // Prepare customer data
      let dateOfBirthISO = data.customer.dateOfBirth;
      if (dateOfBirthISO && !dateOfBirthISO.includes('T')) {
        const date = new Date(dateOfBirthISO + 'T00:00:00');
        if (!isNaN(date.getTime())) {
          dateOfBirthISO = date.toISOString();
        }
      }

      const enquiryData: EnquiryCreateData | EnquiryUpdateData = {
        customer: {
          ...data.customer,
          dateOfBirth: dateOfBirthISO,
          email: data.customer.email || undefined,
          venueEmail: data.customer.venueEmail || undefined,
        },
        typesOfEvent: data.typesOfEvent.filter(event => event.name.trim() !== ""),
      };

      if (mode === 'create') {
        await createEnquiry(enquiryData as EnquiryCreateData);
      } else if (enquiry?._id) {
        await updateEnquiry(enquiry._id, enquiryData as EnquiryUpdateData);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting enquiry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const typesOfEvent = form.watch("typesOfEvent");

  const addEventType = () => {
    form.setValue("typesOfEvent", [...typesOfEvent, { name: "", numberOfGuests: 0 }]);
  };

  const removeEventType = (index: number) => {
    if (typesOfEvent.length > 1) {
      form.setValue("typesOfEvent", typesOfEvent.filter((_, i) => i !== index));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {mode === 'create' ? 'Add New Enquiry' : 'Edit Enquiry'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Customer Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Customer Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customer.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customer.mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile *</FormLabel>
                      <FormControl>
                        <Input placeholder="10 digits" {...field} />
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
                        <Input type="email" placeholder="Enter email" {...field} />
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
                        <Input placeholder="10 digits" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                        <Input type="email" placeholder="Enter venue email" {...field} />
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
                      <Textarea placeholder="Enter address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Types of Event Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Types of Event</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEventType}
                  disabled={isSubmitting || loading || eventsLoading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </div>

              {typesOfEvent.map((_event, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium text-sm">Event {index + 1}</h4>
                    {typesOfEvent.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEventType(index)}
                        disabled={isSubmitting || loading}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <FormField
                      control={form.control}
                      name={`typesOfEvent.${index}.numberOfGuests`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Guests *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              value={field.value || ""}
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
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting || loading || eventsLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || loading || eventsLoading}>
                {isSubmitting || loading
                  ? "Saving..."
                  : mode === 'create'
                  ? "Create Enquiry"
                  : "Update Enquiry"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

