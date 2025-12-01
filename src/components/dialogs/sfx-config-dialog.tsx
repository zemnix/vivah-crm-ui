import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useSfxConfigStore } from "@/store/sfxConfigStore";
import type { SfxConfig, SfxConfigCreateData, SfxConfigUpdateData } from "@/api/sfxConfigApi";

const sfxConfigSchema = z.object({
  name: z.string().min(1, "SFX name is required").max(100, "SFX name must be less than 100 characters"),
});

type SfxConfigForm = z.infer<typeof sfxConfigSchema>;

interface SfxConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sfx?: SfxConfig | null;
  mode: 'create' | 'edit';
}

export function SfxConfigDialog({ open, onOpenChange, sfx, mode }: SfxConfigDialogProps) {
  const { createSfx, updateSfx, loading } = useSfxConfigStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SfxConfigForm>({
    resolver: zodResolver(sfxConfigSchema),
    defaultValues: {
      name: sfx?.name || "",
    },
  });

  // Reset form when sfx changes
  useEffect(() => {
    if (open) {
      form.reset({
        name: sfx?.name || "",
      });
    }
  }, [sfx, open, form]);

  const onSubmit = async (data: SfxConfigForm) => {
    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        const sfxData: SfxConfigCreateData = {
          name: data.name.trim(),
        };
        const result = await createSfx(sfxData);
        if (result) {
          onOpenChange(false);
          form.reset();
        }
      } else if (sfx) {
        const updateData: SfxConfigUpdateData = {
          name: data.name.trim(),
        };
        const result = await updateSfx(sfx._id, updateData);
        if (result) {
          onOpenChange(false);
        }
      }
    } catch (error) {
      console.error('Error saving SFX config:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create SFX' : 'Edit SFX'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SFX Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter SFX name"
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

