import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchableLeadSelect } from "@/components/ui/searchable-lead-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { useAuthStore } from "@/store/authStore";
import { useQuotationStore } from "@/store/quotationStore";
import { useToast } from "@/hooks/use-toast";
import { getLeadByIdApi } from "@/api/leadApi";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { useMachineStore } from "@/store/machineStore";
import type { Machine } from "@/lib/schema";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const quotationCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  address: z.string().min(1, "Address is required"),
  mobile: z.string().min(1, "Mobile is required"),
  email: z.union([z.string().email("Valid email is required"), z.literal(""), z.undefined()]).optional(),
  gst: z.string().optional(),
});

const quotationSchema = z.object({
  leadId: z.string().min(1, "Lead is required"),
  quotationTitle: z.string().optional(),
  customer: quotationCustomerSchema,
  items: z.array(z.object({
    productName: z.string().min(1),
    description: z.string().optional(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    gstPercent: z.number().min(0).max(100),
  })).min(1),
  additionalCharges: z.array(z.object({
    name: z.string().min(1),
    amount: z.number().min(0),
  })).optional(),
  notes: z.string().optional(),
  validityDate: z.string().optional(),
  shippingCost: z.number().min(0).optional(),
  shippingTax: z.number().min(0).optional(),
});

type QuotationForm = z.infer<typeof quotationSchema>;

interface NewQuotationPageProps {
  userRole: 'admin' | 'staff';
  backPath: string;
  testId: string;
}

export default function NewQuotationPage({
  userRole,
  backPath,
  testId
}: NewQuotationPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedLeadId = searchParams.get('leadId');
  const { user } = useAuthStore();
  const { createQuotation } = useQuotationStore();
  const { toast } = useToast();
  const { searchMachines, createMachine } = useMachineStore();
  
  const [selectedLeadId, setSelectedLeadId] = useState(preSelectedLeadId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<QuotationForm>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      leadId: selectedLeadId || "",
      quotationTitle: "",
      customer: {
        name: "",
        address: "",
        mobile: "",
        email: "",
        gst: "",
      },
      items: [
        { productName: "", description: "", quantity: 1, unitPrice: 0, gstPercent: 18 }
      ],
      additionalCharges: [],
      notes: "",
      validityDate: "",
      shippingCost: 0,
      shippingTax: 0,
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const { fields: chargeFields, append: appendCharge, remove: removeCharge } = useFieldArray({
    control: form.control,
    name: "additionalCharges"
  });

  // Product search/typeahead state per row
  const [productQueryByIndex, setProductQueryByIndex] = useState<Record<number, string>>({});
  const [productResultsByIndex, setProductResultsByIndex] = useState<Record<number, Machine[]>>({});
  const [productLoadingByIndex, setProductLoadingByIndex] = useState<Record<number, boolean>>({});
  const productSearchTimers = useState<Record<number, any>>({})[0];

  // Confirmation dialog state
  const [isCreateProductDialogOpen, setIsCreateProductDialogOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductDescription, setNewProductDescription] = useState("");
  const [currentProductIndex, setCurrentProductIndex] = useState<number | null>(null);

  // Set the pre-selected lead when component mounts
  useEffect(() => {
    if (preSelectedLeadId) {
      setSelectedLeadId(preSelectedLeadId);
      // Also populate the form with lead data
      fetchAndPopulateLeadData(preSelectedLeadId);
    }
  }, [preSelectedLeadId]);

  const addItem = () => {
    append({ productName: "", description: "", quantity: 1, unitPrice: 0, gstPercent: 18 });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const updateItem = (index: number, field: 'productName'|'description'|'quantity'|'unitPrice'|'gstPercent', value: any) => {
    form.setValue(`items.${index}.${field}`, value);
  };

  // Function to fetch and populate lead data
  const fetchAndPopulateLeadData = async (leadId: string) => {
    if (!leadId) return;
    
    try {
      const lead = await getLeadByIdApi(leadId);
      
      // Format address as: location, district, state, pinCode
      const addressParts = [];
      if (lead.location) addressParts.push(lead.location);
      if (lead.district) addressParts.push(lead.district);
      if (lead.state) addressParts.push(lead.state);
      if (lead.pinCode) addressParts.push(lead.pinCode.toString());
      const formattedAddress = addressParts.join(', ') || '';
      
      // Populate customer fields with lead data
      form.setValue('customer.name', lead.name || '');
      form.setValue('customer.email', lead.email || '');
      form.setValue('customer.mobile', lead.mobile || '');
      form.setValue('customer.address', formattedAddress);
      form.setValue('customer.gst', '');
      
    } catch (error) {
      console.error('Failed to fetch lead data:', error);
      toast({
        title: "Warning",
        description: "Could not load lead details. You can enter them manually.",
        variant: "destructive",
      });
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;

    fields.forEach((_, index) => {
      const item = form.watch(`items.${index}`);
      const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
      const lineTax = lineTotal * ((item.gstPercent || 0) / 100);
      subtotal += lineTotal;
      taxTotal += lineTax;
    });

    const shippingCost = form.watch('shippingCost') || 0;
    const shippingTax = form.watch('shippingTax') || 0;
    
    let additionalChargesTotal = 0;
    const charges = form.watch('additionalCharges') || [];
    charges.forEach((charge) => {
      additionalChargesTotal += charge.amount || 0;
    });

    return {
      subtotal,
      taxTotal,
      shippingCost,
      shippingTax,
      additionalChargesTotal,
      grandTotal: subtotal + taxTotal + shippingCost + shippingTax + additionalChargesTotal,
    };
  };

  const totals = calculateTotals();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const calculateItemTotals = (item: any) => {
    const subtotal = item.quantity * item.unitPrice;
    const gstAmount = (subtotal * item.gstPercent) / 100;
    const total = subtotal + gstAmount;
    
    return {
      subtotal,
      gstAmount,
      total,
    };
  };

  const handleSubmit = async (data: QuotationForm) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const processedItems = data.items.map(item => {
        const itemTotals = calculateItemTotals(item);
        return {
          productName: item.productName,
          description: item.description || "",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstPercent: item.gstPercent,
          gstAmount: itemTotals.gstAmount,
          total: itemTotals.total,
        };
      });

      const totals = calculateTotals();

      // Set default validity date to 30 days from today if not provided
      let validityDate = data.validityDate;
      if (!validityDate) {
        const defaultValidityDate = new Date();
        defaultValidityDate.setDate(defaultValidityDate.getDate() + 30);
        validityDate = defaultValidityDate.toISOString().split('T')[0];
      }

      const quotationData = {
        leadId: data.leadId,
        staffId: user.id,
        quotationTitle: data.quotationTitle || "",
        customer: {
          ...data.customer,
          gst: data.customer.gst || ""
        },
        items: processedItems,
        subtotal: totals.subtotal,
        tax: totals.taxTotal,
        shippingCost: data.shippingCost || 0,
        shippingTax: data.shippingTax || 0,
        additionalCharges: data.additionalCharges || [],
        grandTotal: totals.grandTotal,
        notes: data.notes || "",
        validityDate: validityDate,
        status: 'draft' as const,
      };

      console.log('Submitting quotation data:', {
        validityDate: data.validityDate,
        quotationData: quotationData
      });

      const result = await createQuotation(quotationData);
      if (result) {
        toast({
          description: "Quotation created successfully",
        });
        navigate(`/${userRole}/quotations/${result._id}`);
      }
    } catch (error) {
      console.error('Failed to create quotation:', error);
      toast({
        title: "Error",
        description: "Failed to create quotation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProduct = (index: number, name: string) => {
    setNewProductName(name);
    setNewProductDescription("");
    setCurrentProductIndex(index);
    setIsCreateProductDialogOpen(true);
  };

  const confirmCreateProduct = async () => {
    if (currentProductIndex === null || !newProductName.trim()) return;

    try {
      const created = await createMachine({ 
        name: newProductName.trim(), 
        description: newProductDescription.trim() 
      });
      
      if (created) {
        updateItem(currentProductIndex, 'productName', created.name);
        updateItem(currentProductIndex, 'description', created.description || '');
        setProductResultsByIndex(prev => ({ ...prev, [currentProductIndex]: [] }));
        setProductQueryByIndex(prev => ({ ...prev, [currentProductIndex]: '' }));
        
        toast({
          title: "Success",
          description: `Product "${created.name}" created successfully`,
        });
      }
    } catch (error) {
      console.error('Failed to create product:', error);
      toast({
        title: "Error",
        description: "Failed to create product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreateProductDialogOpen(false);
      setNewProductName("");
      setNewProductDescription("");
      setCurrentProductIndex(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-2 sm:p-3 lg:p-4" data-testid={testId}>
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(backPath)}
            data-testid="back-button"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quotations
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">New Quotation</h1>
            <p className="text-muted-foreground mt-2">Create a new quotation for a lead</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Quotation Form */}
            <Card>
              <CardHeader>
                <CardTitle>Quotation Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  {/* Customer Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="leadId"
                      render={({ field }: { field: any }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Lead *</FormLabel>
                          <FormControl>
                            <SearchableLeadSelect
                              value={field.value}
                              onValueChange={async (leadId) => {
                                field.onChange(leadId);
                                setSelectedLeadId(leadId);
                                // Fetch and populate lead data
                                await fetchAndPopulateLeadData(leadId);
                              }}
                              placeholder="Search for a lead by name, location, or mobile..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="quotationTitle"
                      render={({ field }: { field: any }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Quotation Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter quotation title (optional)" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customer.name"
                      render={({ field }: { field: any }) => (
                        <FormItem>
                          <FormLabel>Customer Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Customer name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customer.email"
                      render={({ field }: { field: any }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="customer@email.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customer.mobile"
                      render={({ field }: { field: any }) => (
                        <FormItem>
                          <FormLabel>Mobile</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Mobile number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customer.gst"
                      render={({ field }: { field: any }) => (
                        <FormItem>
                          <FormLabel>GST Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="GST number (optional)" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name="customer.address"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Customer address" rows={3} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  {/* Items Table */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Line Items</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addItem}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Tax %</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fields.map((field, index) => {
                          const item = form.watch(`items.${index}`);
                          const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
                          const lineTax = lineTotal * ((item.gstPercent || 0) / 100);
                          const totalWithTax = lineTotal + lineTax;

                          return (
                              <TableRow key={field.id}>
                              <TableCell>
                                <Popover open={(productQueryByIndex[index]?.length ?? 0) >= 3}>
                                  <PopoverAnchor asChild>
                                    <Input
                                      value={item.productName}
                                      onChange={(e) => {
                                        const q = e.target.value;
                                        updateItem(index, 'productName', q);
                                        setProductQueryByIndex(prev => ({ ...prev, [index]: q }));
                                        if (productSearchTimers[index]) clearTimeout(productSearchTimers[index]);
                                        productSearchTimers[index] = setTimeout(async () => {
                                          if (!q || q.trim().length < 3) {
                                            setProductResultsByIndex(prev => ({ ...prev, [index]: [] }));
                                            setProductLoadingByIndex(prev => ({ ...prev, [index]: false }));
                                            return;
                                          }
                                          setProductLoadingByIndex(prev => ({ ...prev, [index]: true }));
                                          const results = await searchMachines(q.trim());
                                          setProductResultsByIndex(prev => ({ ...prev, [index]: results }));
                                          setProductLoadingByIndex(prev => ({ ...prev, [index]: false }));
                                        }, 300);
                                      }}
                                      placeholder="Search product..."
                                    />
                                  </PopoverAnchor>
                                  <PopoverContent 
                                    className="w-[24rem] max-h-60 overflow-auto p-0" 
                                    align="start"
                                    onOpenAutoFocus={(e) => e.preventDefault()}
                                  >
                                    {productLoadingByIndex[index] && (
                                      <div className="p-2 text-sm text-muted-foreground">Searching...</div>
                                    )}
                                    {!productLoadingByIndex[index] && (productResultsByIndex[index]?.length ?? 0) > 0 && (
                                      productResultsByIndex[index]!.map((m) => (
                                        <button
                                          key={m._id}
                                          type="button"
                                          className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                          onClick={() => {
                                            updateItem(index, 'productName', m.name);
                                            updateItem(index, 'description', m.description || '');
                                            setProductResultsByIndex(prev => ({ ...prev, [index]: [] }));
                                            setProductQueryByIndex(prev => ({ ...prev, [index]: '' }));
                                          }}
                                        >
                                          <div className="font-medium">{m.name}</div>
                                          {m.description && (
                                            <div className="text-xs text-muted-foreground line-clamp-2">{m.description}</div>
                                          )}
                                        </button>
                                      ))
                                    )}

                                    {!productLoadingByIndex[index] && (productResultsByIndex[index]?.length ?? 0) === 0 && productQueryByIndex[index]?.length >= 3 && (
                                      <div className="p-2">
                                        <div className="text-sm text-muted-foreground mb-2">No products found</div>
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="cursor-pointer"
                                          onClick={() => {
                                            const name = productQueryByIndex[index];
                                            handleCreateProduct(index, name);
                                          }}
                                        >
                                          Create "{productQueryByIndex[index]}"
                                        </Button>
                                      </div>
                                    )}
                                  </PopoverContent>
                                </Popover>
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={item.description || ''}
                                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                                  placeholder="Description"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.unitPrice === 0 ? '' : item.unitPrice}
                                  onChange={(e) => {
                                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                    updateItem(index, 'unitPrice', isNaN(value) ? 0 : value);
                                  }}
                                  placeholder="0"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="100"
                                  value={item.gstPercent === 0 ? '' : item.gstPercent}
                                  onChange={(e) => {
                                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                    updateItem(index, 'gstPercent', isNaN(value) ? 0 : value);
                                  }}
                                  placeholder="0"
                                />
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">
                                  {formatCurrency(totalWithTax)}
                                </div>
                              </TableCell>
                              <TableCell>
                                {fields.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeItem(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Validity Date */}
                  <div className="space-y-2">
                    <Label htmlFor="validityDate">Validity Date (Optional)</Label>
                    <Input
                      id="validityDate"
                      type="date"
                      value={form.watch('validityDate') || ''}
                      onChange={(e) => form.setValue('validityDate', e.target.value)}
                    />
                  </div>

                  {/* Notes and Shipping */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        rows={3}
                        placeholder="Additional notes..."
                        value={form.watch('notes') || ''}
                        onChange={(e) => form.setValue('notes', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Shipping Cost</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.watch('shippingCost') === 0 ? '' : form.watch('shippingCost')}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          form.setValue('shippingCost', isNaN(value) ? 0 : value);
                        }}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Shipping Tax</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.watch('shippingTax') === 0 ? '' : form.watch('shippingTax')}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          form.setValue('shippingTax', isNaN(value) ? 0 : value);
                        }}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Additional Charges Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Additional Charges</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendCharge({ name: "", amount: 0 })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Charge
                      </Button>
                    </div>

                    {chargeFields.length > 0 && (
                      <div className="space-y-3">
                        {chargeFields.map((field, index) => (
                          <div key={field.id} className="flex gap-3 items-end">
                            <div className="flex-1">
                              <Label>Charge Name</Label>
                              <Input
                                placeholder="e.g., Installation, Training"
                                value={form.watch(`additionalCharges.${index}.name`) || ''}
                                onChange={(e) => form.setValue(`additionalCharges.${index}.name`, e.target.value)}
                              />
                            </div>
                            <div className="w-40">
                              <Label>Amount (₹)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.watch(`additionalCharges.${index}.amount`) === 0 ? '' : form.watch(`additionalCharges.${index}.amount`)}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  form.setValue(`additionalCharges.${index}.amount`, isNaN(value) ? 0 : value);
                                }}
                                placeholder="0"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCharge(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(backPath)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      data-testid="create-quotation"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isSubmitting ? "Creating..." : "Create Quotation"}
                    </Button>
                  </div>
                </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quotation Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(totals.taxTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span>{formatCurrency(totals.shippingCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping Tax:</span>
                  <span>{formatCurrency(totals.shippingTax)}</span>
                </div>
                {totals.additionalChargesTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Additional Charges:</span>
                    <span>{formatCurrency(totals.additionalChargesTotal)}</span>
                  </div>
                )}
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatCurrency(totals.grandTotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Product Confirmation Dialog */}
      <Dialog open={isCreateProductDialogOpen} onOpenChange={setIsCreateProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="product-name">Product Name</Label>
              <Input
                className="mt-2"
                id="product-name"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="Enter product name"
              />
            </div>
            <div>
              <Label htmlFor="product-description">Description</Label>
              <Textarea
                className="mt-2"
                id="product-description"
                value={newProductDescription}
                onChange={(e) => setNewProductDescription(e.target.value)}
                placeholder="Enter product description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="cursor-pointer"
              variant="outline"
              onClick={() => setIsCreateProductDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer"
              onClick={confirmCreateProduct}
              disabled={!newProductName.trim()}
            >
              Create Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
