import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useBaraatConfigStore } from "@/store/baraatConfigStore";
import type { BaraatFieldConfig } from "@/api/baraatConfigApi";
import { useEffect, useState } from "react";
import { Loader, Plus, X } from "lucide-react";

const fieldConfigSchema = z.object({
  name: z.string().min(1, "Field name is required").max(100, "Field name must be less than 100 characters"),
});

type FieldConfigForm = z.infer<typeof fieldConfigSchema>;

interface BaraatFieldConfigDialogProps {
  open: boolean;
  onOpenChange: (success: boolean) => void;
  field?: BaraatFieldConfig | null;
  mode: 'create' | 'edit';
}

export function BaraatFieldConfigDialog({
  open,
  onOpenChange,
  field,
  mode,
}: BaraatFieldConfigDialogProps) {
  const { createField, updateField, loading } = useBaraatConfigStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FieldConfigForm>({
    resolver: zodResolver(fieldConfigSchema),
    defaultValues: {
      name: "",
    },
  });

  // Reset form when field changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      if (field && mode === 'edit') {
        form.reset({
          name: field.name,
        });
      } else {
        form.reset({
          name: "",
        });
      }
    }
  }, [field, mode, open, form]);

  const onSubmit = async (data: FieldConfigForm) => {
    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        await createField({ name: data.name.trim() });
      } else if (field) {
        await updateField(field._id, { name: data.name.trim() });
      }

      setIsSubmitting(false);
      onOpenChange(true);
    } catch (error) {
      console.error("Failed to save field:", error);
      setIsSubmitting(false);
      onOpenChange(false);
    }
  };

  const isPending = loading || isSubmitting;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {mode === 'create' ? 'Add New Field' : 'Edit Field'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Musicians Count"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The name of this baraat field
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {isPending && <Loader className="h-4 w-4 mr-2 animate-spin" />}
                {mode === 'create' ? 'Create Field' : 'Update Field'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

