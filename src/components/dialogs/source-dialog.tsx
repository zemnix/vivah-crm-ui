import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useSourceStore } from "@/store/sourceStore";
import type { Source, SourceCreateData, SourceUpdateData } from "@/api/sourceApi";

const sourceSchema = z.object({
  name: z.string().min(1, "Source name is required").max(100, "Source name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional().or(z.literal("")),
});

type SourceForm = z.infer<typeof sourceSchema>;

interface SourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: Source | null;
  mode: 'create' | 'edit';
}

export function SourceDialog({ open, onOpenChange, source, mode }: SourceDialogProps) {
  const { createSource, updateSource, loading } = useSourceStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SourceForm>({
    resolver: zodResolver(sourceSchema),
    defaultValues: {
      name: source?.name || "",
      description: source?.description || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: source?.name || "",
        description: source?.description || "",
      });
    }
  }, [source, open, form]);

  const onSubmit = async (data: SourceForm) => {
    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        const sourceData: SourceCreateData = {
          name: data.name.trim(),
          description: data.description?.trim() || undefined,
        };
        const result = await createSource(sourceData);
        if (result) {
          onOpenChange(false);
          form.reset();
        }
      } else if (source) {
        const updateData: SourceUpdateData = {
          name: data.name.trim(),
          description: data.description?.trim() || undefined,
        };
        const result = await updateSource(source._id, updateData);
        if (result) {
          onOpenChange(false);
        }
      }
    } catch (error) {
      console.error('Error saving source:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Source' : 'Edit Source'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter source name"
                      {...field}
                      disabled={isSubmitting || loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description"
                      rows={3}
                      {...field}
                      value={field.value || ""}
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
