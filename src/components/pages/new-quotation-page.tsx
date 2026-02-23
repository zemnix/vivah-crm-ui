import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";

import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form } from "@/components/ui/form";
import { SearchableLeadSelect } from "@/components/ui/searchable-lead-select";
import { SearchableItemSelect } from "@/components/ui/searchable-item-select";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/authStore";
import { useQuotationStore } from "@/store/quotationStore";
import { getLeadByIdApi, type Lead } from "@/api/leadApi";
import type { QuotationCreateData } from "@/api/quotationApi";

const quotationItemSchema = z.object({
  category: z.string().trim(),
  itemName: z.string().trim().min(1, "Item name is required"),
  nos: z.string().trim().min(1, "Nos is required"),
  price: z.number().min(0, "Price must be 0 or more"),
});

const additionalChargeSchema = z.object({
  name: z.string().trim().min(1, "Charge name is required"),
  amount: z.number().min(0, "Amount must be 0 or more"),
});

const quotationFormSchema = z.object({
  leadId: z.string().trim().min(1, "Lead is required"),
  quotationTitle: z.string().optional(),
  date: z.string().optional(),
  customer: z.object({
    name: z.string().trim().min(1, "Customer name is required"),
    address: z.string().trim().min(1, "Address is required"),
    mobile: z.string().trim().min(1, "Mobile is required"),
    email: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Invalid email format"),
    gst: z.string().optional(),
  }),
  items: z.array(quotationItemSchema).min(1, "Add at least one quotation row"),
  additionalCharges: z.array(additionalChargeSchema).optional(),
  validityDate: z.string().optional(),
  notes: z.string().optional(),
});

type QuotationForm = z.infer<typeof quotationFormSchema>;

const parseAmount = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    if (!normalized) {
      return 0;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const calculateGrandTotal = (
  items: Array<{ price: unknown }>,
  additionalCharges: Array<{ amount: unknown }>
): number => {
  const itemsTotal = (items || []).reduce((sum, item) => sum + parseAmount(item.price), 0);
  const chargesTotal = (additionalCharges || []).reduce((sum, charge) => sum + parseAmount(charge.amount), 0);
  return itemsTotal + chargesTotal;
};

interface NewQuotationPageProps {
  userRole: "admin" | "staff";
  backPath: string;
  testId: string;
}

export default function NewQuotationPage({
  userRole,
  backPath,
  testId,
}: Readonly<NewQuotationPageProps>) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedLeadId = searchParams.get("leadId") || "";
  const { toast } = useToast();
  const { user } = useAuthStore();
  const { createQuotation } = useQuotationStore();

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<QuotationForm>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      leadId: preSelectedLeadId,
      quotationTitle: "",
      date: new Date().toISOString().split("T")[0],
      customer: {
        name: "",
        address: "",
        mobile: "",
        email: "",
        gst: "",
      },
      items: [{ category: "", itemName: "", nos: "", price: 0 }],
      additionalCharges: [],
      validityDate: "",
      notes: "",
    },
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const {
    fields: additionalChargeFields,
    append: appendAdditionalCharge,
    remove: removeAdditionalCharge,
  } = useFieldArray({
    control: form.control,
    name: "additionalCharges",
  });

  const items = useWatch({
    control: form.control,
    name: "items",
  }) || [];
  const additionalCharges = useWatch({
    control: form.control,
    name: "additionalCharges",
  }) || [];

  const grandTotal = useMemo(() => {
    return calculateGrandTotal(items, additionalCharges);
  }, [items, additionalCharges]);

  const loadLeadAndPopulate = async (leadId: string) => {
    if (!leadId) {
      setSelectedLead(null);
      return;
    }

    try {
      const lead = await getLeadByIdApi(leadId);
      setSelectedLead(lead);

      form.setValue("leadId", lead._id);
      form.setValue("customer.name", lead.customer?.name || "");
      form.setValue("customer.mobile", lead.customer?.mobile || "");
      form.setValue("customer.email", lead.customer?.email || "");
      form.setValue("customer.address", lead.customer?.address || "");
    } catch (error) {
      console.error("Failed to load lead details:", error);
      toast({
        title: "Error",
        description: "Could not load lead details.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (preSelectedLeadId) {
      void loadLeadAndPopulate(preSelectedLeadId);
    }
  }, [preSelectedLeadId]);

  const onSubmit = async (data: QuotationForm) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User session not found.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const computedGrandTotal = calculateGrandTotal(data.items, data.additionalCharges || []);
      const payload: QuotationCreateData = {
        leadId: data.leadId,
        staffId: user.id,
        quotationTitle: data.quotationTitle?.trim() || "",
        date: data.date || new Date().toISOString().split("T")[0],
        customer: {
          name: data.customer.name.trim(),
          address: data.customer.address.trim(),
          mobile: data.customer.mobile.trim(),
          email: data.customer.email?.trim() || "",
          gst: data.customer.gst?.trim() || "",
        },
        items: data.items.map((item) => ({
          category: item.category.trim(),
          itemName: item.itemName.trim(),
          nos: item.nos.trim(),
          price: parseAmount(item.price),
        })),
        additionalCharges: (data.additionalCharges || []).map((charge) => ({
          name: charge.name.trim(),
          amount: parseAmount(charge.amount),
        })),
        grandTotal: computedGrandTotal,
        notes: data.notes?.trim() || "",
        validityDate: data.validityDate || undefined,
        status: "draft",
      };

      const createdQuotation = await createQuotation(payload);

      if (!createdQuotation) {
        throw new Error("Failed to create quotation");
      }

      toast({
        description: "Quotation created successfully.",
      });

      navigate(`/${userRole}/quotations/${createdQuotation._id}`);
    } catch (error) {
      console.error("Quotation create failed:", error);
      toast({
        title: "Error",
        description: "Failed to create quotation.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6" data-testid={testId}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(backPath)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold">New Quotation</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Lead & Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Lead</Label>
                  <SearchableLeadSelect
                    value={form.watch("leadId")}
                    onValueChange={(leadId) => {
                      form.setValue("leadId", leadId, { shouldValidate: true });
                      void loadLeadAndPopulate(leadId);
                    }}
                    placeholder="Search lead by customer name/mobile/address..."
                  />
                  {form.formState.errors.leadId?.message && (
                    <p className="text-sm text-red-600">{form.formState.errors.leadId.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quotation Title</Label>
                    <Input {...form.register("quotationTitle")} placeholder="Wedding quotation" />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" {...form.register("date")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Customer Name</Label>
                    <Input {...form.register("customer.name")} />
                    {form.formState.errors.customer?.name?.message && (
                      <p className="text-sm text-red-600">{form.formState.errors.customer.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Mobile</Label>
                    <Input {...form.register("customer.mobile")} />
                    {form.formState.errors.customer?.mobile?.message && (
                      <p className="text-sm text-red-600">{form.formState.errors.customer.mobile.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input {...form.register("customer.email")} />
                    {form.formState.errors.customer?.email?.message && (
                      <p className="text-sm text-red-600">{form.formState.errors.customer.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>GST (Optional)</Label>
                    <Input {...form.register("customer.gst")} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea rows={2} {...form.register("customer.address")} />
                  {form.formState.errors.customer?.address?.message && (
                    <p className="text-sm text-red-600">{form.formState.errors.customer.address.message}</p>
                  )}
                </div>

                <div className="border rounded-md p-3 bg-muted/20">
                  <p className="text-sm font-medium mb-2">Event Details</p>
                  {selectedLead?.typesOfEvent?.length ? (
                    <div className="space-y-2">
                      {selectedLead.typesOfEvent.map((event, index) => (
                        <div
                          key={`${event.name}-${event.date}-${index}`}
                          className="text-sm flex flex-wrap gap-x-4 gap-y-1"
                        >
                          <span>
                            <strong>Event:</strong> {event.name}
                          </span>
                          <span>
                            <strong>Date:</strong> {new Date(event.date).toLocaleDateString("en-IN")}
                          </span>
                          <span>
                            <strong>Guests:</strong> {event.numberOfGuests}
                          </span>
                          <span>
                            <strong>Session:</strong> {event.dayNight}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No event details available for selected lead.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Quotation Items</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendItem({ category: "", itemName: "", nos: "", price: 0 })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Row
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Particulars</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>NOS</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead className="w-[70px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemFields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell>
                            <Input {...form.register(`items.${index}.category`)} placeholder="Decor" />
                          </TableCell>
                          <TableCell>
                            <SearchableItemSelect
                              value={form.watch(`items.${index}.itemName`)}
                              onValueChange={(itemName) => {
                                form.setValue(`items.${index}.itemName`, itemName, {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                });
                              }}
                              placeholder="Search or create item..."
                            />
                          </TableCell>
                          <TableCell>
                            <Input {...form.register(`items.${index}.nos`)} placeholder="0" />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              {...form.register(`items.${index}.price`, {
                                setValueAs: (value) => parseAmount(value),
                              })}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={itemFields.length <= 1}
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Additional Charges</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendAdditionalCharge({ name: "", amount: 0 })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Charge
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {additionalChargeFields.length === 0 && (
                  <p className="text-sm text-muted-foreground">No additional charges added.</p>
                )}
                {additionalChargeFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_220px_60px] gap-3 items-end">
                    <div className="space-y-2">
                      <Label>Charge Name</Label>
                      <Input {...form.register(`additionalCharges.${index}.name`)} placeholder="Transport" />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...form.register(`additionalCharges.${index}.amount`, {
                          setValueAs: (value) => parseAmount(value),
                        })}
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeAdditionalCharge(index)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes & Total</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Validity Date</Label>
                    <Input type="date" {...form.register("validityDate")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Grand Total</Label>
                    <Input value={grandTotal.toFixed(2)} readOnly />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Comments / Special Instructions</Label>
                  <Textarea rows={4} {...form.register("notes")} />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? "Saving..." : "Create Quotation"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
