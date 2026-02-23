import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { ArrowLeft, Download, Eye, Plus, Save, Trash2 } from "lucide-react";

import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchableLeadSelect } from "@/components/ui/searchable-lead-select";
import { SearchableItemSelect } from "@/components/ui/searchable-item-select";
import { DeleteConfirmationDialog } from "@/components/dialogs/delete-confirmation-dialog";

import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/authStore";
import { useQuotationStore } from "@/store/quotationStore";
import { getLeadByIdApi, type Lead } from "@/api/leadApi";
import type { QuotationStatus, QuotationUpdateData } from "@/api/quotationApi";

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
  status: z.enum(["draft", "sent", "accepted", "rejected"]),
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

interface QuotationDetailPageProps {
  readonly userRole: "admin" | "staff";
  readonly backPath: string;
  readonly testId: string;
}

const allStatuses: QuotationStatus[] = ["draft", "sent", "accepted", "rejected"];

export default function QuotationDetailPage({
  userRole,
  backPath,
  testId,
}: Readonly<QuotationDetailPageProps>) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const hasFetchedRef = useRef(false);

  const {
    selectedQuotation: quotation,
    loading,
    error,
    fetchQuotationById,
    updateQuotation,
    deleteQuotation,
    downloadQuotationPDF,
  } = useQuotationStore();

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const form = useForm<QuotationForm>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      leadId: "",
      quotationTitle: "",
      date: new Date().toISOString().split("T")[0],
      status: "draft",
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
  const selectedStatus = form.watch("status");

  const grandTotal = useMemo(() => {
    return calculateGrandTotal(items, additionalCharges);
  }, [items, additionalCharges]);

  const allowedTransitions = useMemo(() => {
    const currentStatus = quotation?.status || "draft";
    const map: Record<QuotationStatus, QuotationStatus[]> = {
      draft: ["draft", "sent"],
      sent: ["sent", "accepted", "rejected"],
      accepted: ["accepted"],
      rejected: ["rejected"],
    };
    return map[currentStatus];
  }, [quotation?.status]);

  const loadLeadAndPopulate = async (leadId: string, shouldPopulateCustomer = false) => {
    if (!leadId) {
      setSelectedLead(null);
      return;
    }

    try {
      const lead = await getLeadByIdApi(leadId);
      setSelectedLead(lead);

      if (shouldPopulateCustomer) {
        form.setValue("customer.name", lead.customer?.name || "");
        form.setValue("customer.mobile", lead.customer?.mobile || "");
        form.setValue("customer.email", lead.customer?.email || "");
        form.setValue("customer.address", lead.customer?.address || "");
      }
    } catch (err) {
      console.error("Failed to load lead details:", err);
    }
  };

  useEffect(() => {
    if (id && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      void fetchQuotationById(id);
    }
  }, [id, fetchQuotationById]);

  useEffect(() => {
    if (!quotation) {
      return;
    }

    const validityDate = quotation.validityDate ? quotation.validityDate.split("T")[0] : "";
    const quotationDate = quotation.date ? quotation.date.split("T")[0] : new Date().toISOString().split("T")[0];

    form.reset({
      leadId: quotation.leadId?._id || "",
      quotationTitle: quotation.quotationTitle || "",
      date: quotationDate,
      status: quotation.status,
      customer: {
        name: quotation.customer?.name || "",
        address: quotation.customer?.address || "",
        mobile: quotation.customer?.mobile || "",
        email: quotation.customer?.email || "",
        gst: quotation.customer?.gst || "",
      },
      items:
        quotation.items?.length > 0
          ? quotation.items.map((item) => ({
              category: item.category || "",
              itemName: item.itemName || item.productName || "",
              nos: item.nos || String(item.quantity || ""),
              price:
                typeof item.price === "number"
                  ? item.price
                  : typeof item.total === "number"
                    ? item.total
                    : 0,
            }))
          : [{ category: "", itemName: "", nos: "", price: 0 }],
      additionalCharges: quotation.additionalCharges || [],
      validityDate,
      notes: quotation.notes || "",
    });

    if (quotation.leadId?._id) {
      void loadLeadAndPopulate(quotation.leadId._id, false);
    }
  }, [quotation, form]);

  const buildPayload = (data: QuotationForm): QuotationUpdateData => {
    const computedGrandTotal = calculateGrandTotal(data.items, data.additionalCharges || []);

    return {
      leadId: data.leadId,
      staffId: quotation?.staffId?._id || user?.id || "",
      quotationTitle: data.quotationTitle?.trim() || "",
      date: data.date || new Date().toISOString().split("T")[0],
      status: data.status,
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
    };
  };

  const onSubmit = async (data: QuotationForm) => {
    if (!id) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildPayload(data);
      await updateQuotation(id, payload);
      toast({
        description: "Quotation updated successfully.",
      });
      void fetchQuotationById(id);
    } catch (err) {
      console.error("Quotation update failed:", err);
      toast({
        title: "Error",
        description: "Failed to update quotation.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) {
      return;
    }

    setIsDeleting(true);
    try {
      const ok = await deleteQuotation(id);
      if (!ok) {
        throw new Error("Delete failed");
      }
      toast({
        description: "Quotation deleted successfully.",
      });
      navigate(backPath);
    } catch (err) {
      console.error("Quotation delete failed:", err);
      toast({
        title: "Error",
        description: "Failed to delete quotation.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleDownload = async () => {
    if (!quotation) {
      return;
    }
    const ok = await downloadQuotationPDF(quotation);
    if (!ok) {
      toast({
        title: "Error",
        description: "Failed to generate PDF.",
        variant: "destructive",
      });
    }
  };

  if (loading && !quotation) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (error && !quotation) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(backPath)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <p className="text-red-600">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6" data-testid={testId}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(backPath)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => navigate(`/${userRole}/quotations/${id}/preview`)}
              disabled={!id}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button variant="outline" onClick={handleDownload} disabled={!quotation}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            {userRole === "admin" && (
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-semibold">Quotation {quotation?.quotationNo ? `- ${quotation.quotationNo}` : ""}</h1>
          <p className="text-sm text-muted-foreground">Created by {quotation?.staffId?.name || "N/A"}</p>
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
                      void loadLeadAndPopulate(leadId, true);
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Quotation Title</Label>
                    <Input {...form.register("quotationTitle")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" {...form.register("date")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={selectedStatus}
                      onValueChange={(value) =>
                        form.setValue("status", value as QuotationStatus, { shouldValidate: true })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allStatuses.map((status) => (
                          <SelectItem key={status} value={status} disabled={!allowedTransitions.includes(status)}>
                            {status.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Customer Name</Label>
                    <Input {...form.register("customer.name")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mobile</Label>
                    <Input {...form.register("customer.mobile")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input {...form.register("customer.email")} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea rows={2} {...form.register("customer.address")} />
                </div>

                <div className="space-y-2">
                  <Label>GST (Optional)</Label>
                  <Input {...form.register("customer.gst")} />
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
                    <p className="text-sm text-muted-foreground">No event details available.</p>
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
              <CardContent>
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
                            <Input {...form.register(`items.${index}.category`)} />
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
                            <Input {...form.register(`items.${index}.nos`)} />
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
                      <Input {...form.register(`additionalCharges.${index}.name`)} />
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
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDelete}
          itemName={id}
          itemType="quotation"
          title="Delete Quotation"
          description="Are you sure you want to delete this quotation? This action cannot be undone."
          isLoading={isDeleting}
        />
      </div>
    </DashboardLayout>
  );
}
