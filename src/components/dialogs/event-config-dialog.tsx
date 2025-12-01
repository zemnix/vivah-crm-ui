import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useEventConfigStore } from "@/store/eventConfigStore";
import type { EventConfig, EventConfigCreateData, EventConfigUpdateData } from "@/api/eventConfigApi";

const eventConfigSchema = z.object({
  name: z.string().min(1, "Event name is required").max(100, "Event name must be less than 100 characters"),
});

type EventConfigForm = z.infer<typeof eventConfigSchema>;

interface EventConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: EventConfig | null;
  mode: 'create' | 'edit';
}

export function EventConfigDialog({ open, onOpenChange, event, mode }: EventConfigDialogProps) {
  const { createEvent, updateEvent, loading } = useEventConfigStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EventConfigForm>({
    resolver: zodResolver(eventConfigSchema),
    defaultValues: {
      name: event?.name || "",
    },
  });

  // Reset form when event changes
  useEffect(() => {
    if (open) {
      form.reset({
        name: event?.name || "",
      });
    }
  }, [event, open, form]);

  const onSubmit = async (data: EventConfigForm) => {
    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        const eventData: EventConfigCreateData = {
          name: data.name.trim(),
        };
        const result = await createEvent(eventData);
        if (result) {
          onOpenChange(false);
          form.reset();
        }
      } else if (event) {
        const updateData: EventConfigUpdateData = {
          name: data.name.trim(),
        };
        const result = await updateEvent(event._id, updateData);
        if (result) {
          onOpenChange(false);
        }
      }
    } catch (error) {
      console.error('Error saving event config:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Event' : 'Edit Event'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter event name"
                      {...field}
                      disabled={isSubmitting || loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting || loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || loading}>
                {isSubmitting || loading
                  ? mode === 'create'
                    ? "Creating..."
                    : "Updating..."
                  : mode === 'create'
                  ? "Create"
                  : "Update"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

