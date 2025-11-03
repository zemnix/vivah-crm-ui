import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useWorkEntryStore } from "@/store/workEntryStore";
import { useAuthStore } from "@/store/authStore";
import { WORK_UNITS, type WorkEntry, type QuantityPair } from "@/api/workEntryApi";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

const quantityPairSchema = z.object({
  quantity: z.number().min(0.01, "Quantity must be greater than 0").positive("Quantity must be positive"),
  size: z.string().optional(),
});

const workEntrySchema = z.object({
  workerName: z.string().optional(),
  workName: z.string().min(1, "Work name is required").min(2, "Work name must be at least 2 characters"),
  quantities: z.array(quantityPairSchema).min(1, "At least one quantity is required"),
  units: z.enum(['kg', 'g', 'pieces', 'units', 'other'] as const),
  remarks: z.string().optional(),
});

type WorkEntryForm = z.infer<typeof workEntrySchema>;

interface WorkEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workEntry?: WorkEntry | null;
  mode?: 'create' | 'edit';
}

export function WorkEntryDialog({ open, onOpenChange, workEntry, mode = 'create' }: WorkEntryDialogProps) {
  const { createWorkEntry, updateWorkEntry, loading } = useWorkEntryStore();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const form = useForm<WorkEntryForm>({
    resolver: zodResolver(workEntrySchema),
    defaultValues: {
      workerName: workEntry?.workerName || user?.name || "",
      workName: workEntry?.workName || "",
      quantities: workEntry?.quantities && workEntry.quantities.length > 0
        ? workEntry.quantities
        : workEntry?.quantity 
          ? [{ quantity: workEntry.quantity, size: workEntry.size || "" }]
          : [{ quantity: 0, size: "" }],
      units: workEntry?.units || 'pieces',
      remarks: workEntry?.remarks || "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "quantities",
  });

  // Reset form when workEntry changes
  useEffect(() => {
    if (workEntry) {
      const quantities = workEntry.quantities && workEntry.quantities.length > 0
        ? workEntry.quantities
        : [{ quantity: workEntry.quantity || 0, size: workEntry.size || "" }];
      
      form.reset({
        workerName: workEntry.workerName,
        workName: workEntry.workName,
        quantities,
        units: workEntry.units,
        remarks: workEntry.remarks || "",
      });
    } else if (mode === 'create') {
      form.reset({
        workerName: user?.name || "",
        workName: "",
        quantities: [{ quantity: 0, size: "" }],
        units: 'pieces',
        remarks: "",
      });
    }
  }, [workEntry, mode, user, form]);

  const onSubmit = async (data: WorkEntryForm) => {
    if (!user) return;

    setIsSubmitting(true);
    
    try {
      // Filter out empty quantities and ensure at least one valid pair
      const validQuantities: QuantityPair[] = data.quantities
        .filter(q => q.quantity > 0)
        .map(q => ({
          quantity: q.quantity,
          size: q.size?.trim() || undefined,
        }));

      if (validQuantities.length === 0) {
        form.setError("quantities", { message: "At least one quantity is required" });
        setIsSubmitting(false);
        return;
      }

      const entryData = {
        workerName: data.workerName || user.name,
        workName: data.workName,
        quantities: validQuantities,
        units: data.units,
        remarks: data.remarks || undefined,
        attachmentFile: attachmentFile || undefined,
      };

      if (mode === 'create') {
        const newEntry = await createWorkEntry(entryData);
        if (newEntry) {
          form.reset();
          setAttachmentFile(null);
          onOpenChange(false);
        }
      } else if (mode === 'edit' && workEntry) {
        const updatedEntry = await updateWorkEntry(workEntry._id, entryData);
        if (updatedEntry) {
          onOpenChange(false);
        }
      }
    } catch (error) {
      console.error('Error saving work entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPending = loading || isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Work Entry' : 'Edit Work Entry'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="workerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Worker Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Name of worker" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="workName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Name of work/task" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="units"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Units *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WORK_UNITS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Quantity/Size Pairs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Quantity & Size *</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ quantity: 0, size: "" })}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Pair
                </Button>
              </div>
              
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-start">
                  <FormField
                    control={form.control}
                    name={`quantities.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={index === 0 ? "" : "opacity-0"}>
                          Quantity *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`quantities.${index}.size`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={index === 0 ? "" : "opacity-0"}>
                          Size
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. 10x20 cm"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="mt-6 md:mt-0 text-destructive hover:text-destructive"
                      title="Remove this pair"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              {form.formState.errors.quantities && typeof form.formState.errors.quantities === 'object' && 'message' in form.formState.errors.quantities && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.quantities.message}
                </p>
              )}
            </div>

            {/* Attachment */}
            <div>
              <FormLabel>Attachment</FormLabel>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setAttachmentFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                />
                {attachmentFile && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {attachmentFile.name}
                  </span>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes or remarks"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : mode === 'create' ? 'Add Entry' : 'Update Entry'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
