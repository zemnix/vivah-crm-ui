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
import type { BaraatFieldConfig, FieldType } from "@/api/baraatConfigApi";
import { useEffect, useState } from "react";
import { Loader, Plus, X } from "lucide-react";

const fieldConfigSchema = z.object({
  label: z.string().min(1, "Label is required").max(100, "Label must be less than 100 characters"),
  key: z.string()
    .optional()
    .refine(
      (val) => !val || /^[a-z][a-zA-Z0-9]*$/.test(val),
      "Key must start with lowercase letter and contain only alphanumeric characters (camelCase)"
    ),
  type: z.enum(['text', 'number', 'textarea', 'dropdown'] as const),
  dropdownOptions: z.array(z.string().min(1, "Option cannot be empty")).optional(),
  required: z.boolean().default(false),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
}).refine(
  (data) => {
    if (data.type === 'dropdown') {
      return data.dropdownOptions && data.dropdownOptions.length > 0;
    }
    return true;
  },
  {
    message: "Dropdown options are required when type is dropdown",
    path: ["dropdownOptions"],
  }
);

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
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");

  const form = useForm<FieldConfigForm>({
    resolver: zodResolver(fieldConfigSchema),
    defaultValues: {
      label: "",
      key: "",
      type: "text",
      dropdownOptions: [],
      required: false,
      order: undefined,
      isActive: true,
    },
  });

  const fieldType = form.watch("type");

  // Reset form when field changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      if (field && mode === 'edit') {
        form.reset({
          label: field.label,
          key: field.key,
          type: field.type,
          dropdownOptions: field.dropdownOptions || [],
          required: field.required,
          order: field.order,
          isActive: field.isActive,
        });
        setDropdownOptions(field.dropdownOptions || []);
      } else {
        form.reset({
          label: "",
          key: "",
          type: "text",
          dropdownOptions: [],
          required: false,
          order: undefined,
          isActive: true,
        });
        setDropdownOptions([]);
      }
    }
  }, [field, mode, open, form]);

  // Update form when dropdown options change
  useEffect(() => {
    form.setValue("dropdownOptions", dropdownOptions);
  }, [dropdownOptions, form]);

  const handleAddOption = () => {
    if (newOption.trim() && !dropdownOptions.includes(newOption.trim())) {
      setDropdownOptions([...dropdownOptions, newOption.trim()]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (index: number) => {
    setDropdownOptions(dropdownOptions.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FieldConfigForm) => {
    setIsSubmitting(true);
    try {
      const fieldData = {
        ...data,
        dropdownOptions: data.type === 'dropdown' ? data.dropdownOptions : undefined,
      };

      if (mode === 'create') {
        await createField(fieldData);
      } else if (field) {
        await updateField(field._id, fieldData);
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
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Musicians Count"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The display name for this field
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Auto-generated from label (e.g., musiciansCount)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Unique identifier (camelCase). Auto-generated if not provided.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Type *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select field type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="textarea">Textarea</SelectItem>
                      <SelectItem value="dropdown">Dropdown</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {fieldType === 'dropdown' && (
              <FormField
                control={form.control}
                name="dropdownOptions"
                render={() => (
                  <FormItem>
                    <FormLabel>Dropdown Options *</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter option"
                            value={newOption}
                            onChange={(e) => setNewOption(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddOption();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddOption}
                            disabled={!newOption.trim()}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        {dropdownOptions.length > 0 && (
                          <div className="space-y-1">
                            {dropdownOptions.map((option, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 border rounded"
                              >
                                <span className="text-sm">{option}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveOption(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Add options for the dropdown field
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="required"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Required</FormLabel>
                      <FormDescription>
                        Make this field mandatory
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Show this field in forms
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Auto-assigned if not provided"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Display order (lower numbers appear first)
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

