import { useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { useQuotationStore } from "@/store/quotationStore";
import { useAuthStore } from "@/store/authStore";
import { useLeads } from "@/hooks/useApi";
import { useUserStore } from "@/store/admin/userStore";
import { useUploadStore } from "@/store/uploadStore";
import { ReactPDFService } from "@/services/reactPdfService";
import { ArrowLeft, Plus, Trash2, Download, Save, Eye, MoreHorizontal, User } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "@/components/dialogs/delete-confirmation-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import type { QuotationCreateData, QuotationUpdateData, QuotationItem } from "@/api/quotationApi";
import { useMachineStore } from "@/store/machineStore";
import type { Machine } from "@/lib/schema";

// Updated schema to match backend model
const quotationItemSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be positive"),
  gstPercent: z.number().min(0).max(100, "GST percentage must be between 0 and 100"),
});

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
  items: z.array(quotationItemSchema).min(1, "At least one item is required"),
  additionalCharges: z.array(z.object({
    name: z.string().min(1),
    amount: z.number().min(0),
  })).optional(),
  notes: z.string().optional(),
  validityDate: z.string().optional(),
  shippingCost: z.number().min(0, "Shipping cost must be positive").optional(),
  shippingTax: z.number().min(0, "Shipping tax must be positive").optional(),
});

type QuotationForm = z.infer<typeof quotationSchema>;

interface QuotationDetailPageProps {
  readonly userRole: 'admin' | 'staff';
  readonly backPath: string;
  readonly testId: string;
}

export default function QuotationDetailPage({
  userRole,
  backPath,
  testId
}: QuotationDetailPageProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const hasFetchedRef = useRef(false);
  
  // Zustand store hooks
  const {
    selectedQuotation: quotation,
    loading,
    error,
    fetchQuotationById,
    updateQuotation,
    deleteQuotation,
    setSelectedQuotation,
    pdfGenerating,
  } = useQuotationStore();
  
  const { user } = useAuthStore();
  const { fetchAllUsers } = useUserStore();
  const { uploadPDF, isUploading: isUploadingPDF } = useUploadStore();
  
  const { data: leads } = useLeads();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBackgroundSaving, setIsBackgroundSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<QuotationForm>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      leadId: "",
      quotationTitle: "",
      customer: {
        name: "",
        address: "",
        mobile: "",
        email: "",
        gst: "",
      },
      items: [
        { 
          productName: "", 
          description: "", 
          quantity: 1, 
          unitPrice: 0, 
          gstPercent: 18 
        },
      ],
      additionalCharges: [],
      notes: "",
      validityDate: "",
      shippingCost: 0,
      shippingTax: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { fields: chargeFields, append: appendCharge, remove: removeCharge } = useFieldArray({
    control: form.control,
    name: "additionalCharges",
  });

  // Product search/typeahead state
  const { searchMachines, createMachine } = useMachineStore();
  const [productQueryByIndex, setProductQueryByIndex] = useState<Record<number, string>>({});
  const [productResultsByIndex, setProductResultsByIndex] = useState<Record<number, Machine[]>>({});
  const [productLoadingByIndex, setProductLoadingByIndex] = useState<Record<number, boolean>>({});
  const productSearchTimers = useRef<Record<number, any>>({});

  // Confirmation dialog state
  const [isCreateProductDialogOpen, setIsCreateProductDialogOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductDescription, setNewProductDescription] = useState("");
  const [currentProductIndex, setCurrentProductIndex] = useState<number | null>(null);

  // Fetch quotation data on mount
  useEffect(() => {
    if (id && id !== 'new' && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchQuotationById(id);
    }
  }, [id, fetchQuotationById]);

  // Fetch staff members for admin
  useEffect(() => {
    if (userRole === 'admin') {
      fetchAllUsers();
    }
  }, [userRole, fetchAllUsers]);

  // Update form when quotation data loads
  useEffect(() => {
    if (quotation && id !== 'new') {
      // Convert validityDate to YYYY-MM-DD format for HTML date input
      const formatDateForInput = (dateString: string | undefined) => {
        if (!dateString) return "";
        try {
          const date = new Date(dateString);
          return date.toISOString().split('T')[0]; // YYYY-MM-DD format
        } catch (error) {
          console.error('Error formatting validity date:', error);
          return "";
        }
      };

      console.log('Loading quotation data:', {
        validityDate: quotation.validityDate,
        validityDateType: typeof quotation.validityDate,
        formatted: formatDateForInput(quotation.validityDate),
        quotationKeys: Object.keys(quotation)
      });

      form.reset({
        leadId: quotation.leadId._id,
        quotationTitle: quotation.quotationTitle || "",
        customer: quotation.customer,
        items: quotation.items.map(item => ({
          productName: item.productName,
          description: item.description || "",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gstPercent: item.gstPercent,
        })),
        additionalCharges: quotation.additionalCharges || [],
        notes: quotation.notes || "",
        validityDate: formatDateForInput(quotation.validityDate),
        shippingCost: quotation.shippingCost || 0,
        shippingTax: (quotation as any).shippingTax || 0,
      });
    }
  }, [quotation, form, id]);

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

  const calculateTotals = () => {
    const items = form.watch('items');
    const shippingCost = form.watch('shippingCost') || 0;
    const shippingTax = form.watch('shippingTax') || 0;
    const additionalCharges = form.watch('additionalCharges') || [];
    
    let subtotal = 0;
    let taxTotal = 0;

    items.forEach(item => {
      const itemTotals = calculateItemTotals(item);
      subtotal += itemTotals.subtotal;
      taxTotal += itemTotals.gstAmount;
    });

    let additionalChargesTotal = 0;
    additionalCharges.forEach((charge: any) => {
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

  // Helper function to get valid status transitions
  const getValidStatusTransitions = (currentStatus: string) => {
    const validTransitions = {
      'draft': ['sent'],
      'sent': ['accepted', 'rejected'],
      'accepted': [],
      'rejected': []
    };
    return validTransitions[currentStatus as keyof typeof validTransitions] || [];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const prepareQuotationData = (data: QuotationForm): QuotationCreateData | QuotationUpdateData => {
    const processedItems: QuotationItem[] = data.items.map(item => {
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

    console.log('Preparing quotation data for update:', {
      validityDate: data.validityDate,
      formData: data
    });

    return {
      leadId: data.leadId,
      staffId: user?.id || "",
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
      validityDate: data.validityDate || undefined,
    };
  };

  const onSubmit = async (data: QuotationForm) => {
    if (!quotation) return;
    
    setIsSubmitting(true);
    
    // Store original data for rollback
    const originalQuotation = { ...quotation };
    
    try {
      const quotationData = prepareQuotationData(data);
      
      // Optimistic update - update UI immediately
      const optimisticQuotation = {
        ...quotation,
        ...quotationData,
        updatedAt: new Date().toISOString(),
      };
      
      // Update the store immediately for instant UI feedback
      setSelectedQuotation(optimisticQuotation as any);

      // update immediately in ui using toast
      toast({
        description: "Changes saved successfully",
      });
      
      // Update in background
      setIsBackgroundSaving(true);
      const result = await updateQuotation(quotation._id, quotationData);
      setIsBackgroundSaving(false);
      
      if (!result) {
        // If backend update failed, rollback to original data
        setSelectedQuotation(originalQuotation);
        toast({
          description: "Failed to save changes. Please try again.",
          variant: "destructive",
        });
      } else {
        // Update with server response to ensure consistency
        setSelectedQuotation(result);
        toast({
          description: "Quotation updated successfully",
        });
      }
    } catch (error) {
      // Rollback on error
      setSelectedQuotation(originalQuotation);
      console.error('Error saving quotation:', error);
      toast({
        description: "Failed to save quotation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!quotation) return;
    
    // Store original data for rollback
    const originalQuotation = { ...quotation };
    
    try {
      // Optimistic update - update UI immediately
      const optimisticQuotation = {
        ...quotation,
        status: newStatus as any,
        updatedAt: new Date().toISOString(),
      };
      
      setSelectedQuotation(optimisticQuotation);
      
      // Show immediate feedback
      toast({
        description: `Status changed to ${newStatus}`,
      });
      
      // Update in background
      setIsBackgroundSaving(true);
      const result = await updateQuotation(quotation._id, { status: newStatus as any });
      setIsBackgroundSaving(false);
      
      if (!result) {
        // Rollback on failure
        setSelectedQuotation(originalQuotation);
        toast({
          description: `Failed to ${newStatus} quotation. Please try again.`,
          variant: "destructive",
        });
      } else {
        // Update with server response
        setSelectedQuotation(result);
        toast({
          description: `Quotation ${newStatus} successfully`,
        });
      }
    } catch (error) {
      // Rollback on error
      setSelectedQuotation(originalQuotation);
      console.error('Error changing quotation status:', error);
      
      // Check if it's a status transition error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('Invalid status transition')) {
        toast({
          title: "Invalid Status Change",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          description: `Failed to ${newStatus} quotation. Please try again.`,
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!quotation) return;
    
    setIsDeleting(true);
    try {
      await deleteQuotation(quotation._id);
      toast({
        title: "Success",
        description: "Quotation deleted successfully",
      });
      navigate(backPath);
    } catch (error) {
      console.error('Error deleting quotation:', error);
      toast({
        title: "Error",
        description: "Failed to delete quotation",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };


  const handleDownloadPDF = async () => {
    if (!quotation) return;
    
    try {
      // Generate PDF blob using ReactPDFService directly
      const pdfBlob = await ReactPDFService.generateQuotationPDF(quotation);
      if (!pdfBlob) {
        throw new Error('Failed to generate PDF');
      }

      // Create filename
      const filename = `quotation-${quotation.quotationNo || quotation._id}.pdf`;
      
      // Upload PDF to backend
      const uploadResponse = await uploadPDF(pdfBlob, filename);
      
      // Update quotation with PDF URL
      const updateResult = await updateQuotation(quotation._id, { pdfUrl: uploadResponse.fileURL });
      
      if (updateResult) {
        toast({
          title: "Success",
          description: "PDF downloaded and stored in database successfully",
        });
      } else {
        toast({
          title: "Warning",
          description: "PDF downloaded but failed to store link in database",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error downloading and uploading PDF:', error);
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive",
      });
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
        form.setValue(`items.${currentProductIndex}.productName`, created.name);
        form.setValue(`items.${currentProductIndex}.description`, created.description || "");
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

  // Handle new quotation creation
  if (id === 'new') {
    return (
      <DashboardLayout>
        <div className="p-6" data-testid="new-quotation-page">
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
            <h1 className="text-3xl font-bold text-foreground">New Quotation</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create Quotation</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Lead Selection */}
                  <FormField
                    control={form.control}
                    name="leadId"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Lead</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a lead" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {leads?.map((lead) => (
                              <SelectItem key={lead.id} value={lead.id}>
                                {lead.name} - {lead.email}
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
                    name="quotationTitle"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Quotation Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter quotation title (optional)" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Customer Information */}
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>

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

                  {/* Items Table */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Line Items</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ 
                          productName: "", 
                          description: "", 
                          quantity: 1, 
                          unitPrice: 0, 
                          gstPercent: 18 
                        })}
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
                          <TableHead>GST %</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fields.map((field, index) => {
                          const item = form.watch(`items.${index}`);
                          const itemTotals = calculateItemTotals(item);

                          return (
                            <TableRow key={field.id}>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.productName`}
                                  render={({ field }: { field: any }) => (
                                    <FormControl>
                                      <Popover open={(productQueryByIndex[index]?.length ?? 0) >= 3}>
                                        <PopoverAnchor asChild>
                                          <Input
                                            {...field}
                                            placeholder="Search product..."
                                            onChange={(e) => {
                                              field.onChange(e.target.value);
                                              const q = e.target.value;
                                              setProductQueryByIndex(prev => ({ ...prev, [index]: q }));
                                              // debounce
                                              if (productSearchTimers.current[index]) {
                                                clearTimeout(productSearchTimers.current[index]);
                                              }
                                              productSearchTimers.current[index] = setTimeout(async () => {
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
                                                  form.setValue(`items.${index}.productName`, m.name);
                                                  form.setValue(`items.${index}.description`, m.description || "");
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
                                    </FormControl>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.description`}
                                  render={({ field }: { field: any }) => (
                                    <FormControl>
                                      <Input {...field} placeholder="Description" />
                                    </FormControl>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.quantity`}
                                  render={({ field }: { field: any }) => (
                                    <FormControl>
                                      <Input
                                        {...field}
                                        type="number"
                                        min="1"
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                      />
                                    </FormControl>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.unitPrice`}
                                  render={({ field }: { field: any }) => (
                                    <FormControl>
                                      <Input
                                        {...field}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={field.value === 0 ? '' : field.value}
                                        onChange={(e) => {
                                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                          field.onChange(isNaN(value) ? 0 : value);
                                        }}
                                        placeholder="0"
                                      />
                                    </FormControl>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.gstPercent`}
                                  render={({ field }: { field: any }) => (
                                    <FormControl>
                                      <Input
                                        {...field}
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="100"
                                        value={field.value === 0 ? '' : field.value}
                                        onChange={(e) => {
                                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                          field.onChange(isNaN(value) ? 0 : value);
                                        }}
                                        placeholder="0"
                                      />
                                    </FormControl>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">
                                  {formatCurrency(itemTotals.total)}
                                </div>
                              </TableCell>
                              <TableCell>
                                {fields.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => remove(index)}
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

                  {/* Terms, Notes, and Shipping */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }: { field: any }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} placeholder="Additional notes..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="validityDate"
                      render={({ field }: { field: any }) => (
                        <FormItem>
                          <FormLabel>Validity Date (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="shippingCost"
                      render={({ field }: { field: any }) => (
                        <FormItem>
                          <FormLabel>Shipping Cost</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                              value={field.value === 0 ? '' : field.value}
                              onChange={(e) => {
                                const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                field.onChange(isNaN(value) ? 0 : value);
                              }}
                              placeholder="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!quotation && !loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground">Quotation Not Found</h2>
            <p className="text-muted-foreground mt-2">The quotation you're looking for doesn't exist.</p>
            <Button onClick={() => navigate(backPath)} className="mt-4">
              Back to Quotations
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground">Error Loading Quotation</h2>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button onClick={() => navigate(backPath)} className="mt-4">
              Back to Quotations
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-2 sm:p-3 lg:p-4" data-testid={testId}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-4">
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
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                Quotation {quotation?.quotationNo}
                {isBackgroundSaving && (
                  <span className="text-sm text-muted-foreground font-normal">(Syncing...)</span>
                )}
              </h1>
              <p className="text-muted-foreground">{quotation?.customer.name} - {quotation?.customer.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {quotation?.status && (
              <StatusBadge status={quotation.status as any} type="quotation" />
            )}
            <Select value={quotation?.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-32" data-testid="status-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quotation?.status && (
                  <>
                    <SelectItem value={quotation.status} disabled>
                      {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                    </SelectItem>
                    {getValidStatusTransitions(quotation.status).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            
            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/${userRole}/quotations/${quotation?._id}/preview`)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview PDF
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDownloadPDF}
                  disabled={pdfGenerating || isUploadingPDF}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {pdfGenerating || isUploadingPDF ? "Processing..." : "Download PDF"}
                </DropdownMenuItem>
                {userRole === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information - Editable */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="quotationTitle"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Quotation Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter quotation title (optional)" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="customer.name"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Customer</FormLabel>
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
                            <Textarea {...field} rows={3} placeholder="Customer address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                </Form>
              </CardContent>
            </Card>

            {/* Quotation Form */}
            <Card>
              <CardHeader>
                <CardTitle>Quotation Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Items Table */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Line Items</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => append({ 
                            productName: "", 
                            description: "", 
                            quantity: 1, 
                            unitPrice: 0, 
                            gstPercent: 18 
                          })}
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
                            <TableHead>GST %</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((field, index) => {
                            const item = form.watch(`items.${index}`);
                            const itemTotals = calculateItemTotals(item);

                            return (
                              <TableRow key={field.id}>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.productName`}
                                    render={({ field }: { field: any }) => (
                                      <FormControl>
                                        <Input {...field} placeholder="Product name" />
                                      </FormControl>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.description`}
                                    render={({ field }: { field: any }) => (
                                      <FormControl>
                                        <Input {...field} placeholder="Description" />
                                      </FormControl>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.quantity`}
                                    render={({ field }: { field: any }) => (
                                      <FormControl>
                                        <Input
                                          {...field}
                                          type="number"
                                          min="1"
                                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                        />
                                      </FormControl>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.unitPrice`}
                                    render={({ field }: { field: any }) => (
                                      <FormControl>
                                        <Input
                                          {...field}
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={field.value === 0 ? '' : field.value}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                            field.onChange(isNaN(value) ? 0 : value);
                                          }}
                                          placeholder="0"
                                        />
                                      </FormControl>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.gstPercent`}
                                    render={({ field }: { field: any }) => (
                                      <FormControl>
                                        <Input
                                          {...field}
                                          type="number"
                                          step="0.1"
                                          min="0"
                                          max="100"
                                          value={field.value === 0 ? '' : field.value}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                            field.onChange(isNaN(value) ? 0 : value);
                                          }}
                                          placeholder="0"
                                        />
                                      </FormControl>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">
                                    {formatCurrency(itemTotals.total)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {fields.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => remove(index)}
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

                    {/* Notes and Shipping */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={3} placeholder="Additional notes..." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="validityDate"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel>Validity Date (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                    <FormField
                        control={form.control}
                        name="shippingCost"
                        render={({ field }: { field: any }) => (
                          <FormItem>
                            <FormLabel>Shipping Cost</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                min="0"
                                value={field.value === 0 ? '' : field.value}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  field.onChange(isNaN(value) ? 0 : value);
                                }}
                                placeholder="0"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    <FormField
                      control={form.control}
                      name="shippingTax"
                      render={({ field }: { field: any }) => (
                        <FormItem>
                          <FormLabel>Shipping Tax</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                              value={field.value === 0 ? '' : field.value}
                              onChange={(e) => {
                                const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                field.onChange(isNaN(value) ? 0 : value);
                              }}
                              placeholder="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                                <FormField
                                  control={form.control}
                                  name={`additionalCharges.${index}.name`}
                                  render={({ field }: { field: any }) => (
                                    <FormItem>
                                      <FormLabel>Charge Name</FormLabel>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          placeholder="e.g., Installation, Training"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="w-40">
                                <FormField
                                  control={form.control}
                                  name={`additionalCharges.${index}.amount`}
                                  render={({ field }: { field: any }) => (
                                    <FormItem>
                                      <FormLabel>Amount (₹)</FormLabel>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={field.value === 0 ? '' : field.value}
                                          onChange={(e) => {
                                            const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                            field.onChange(isNaN(value) ? 0 : value);
                                          }}
                                          placeholder="0"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCharge(index)}
                                className="mb-2"
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
                        type="submit"
                        disabled={isSubmitting}
                        data-testid="save-quotation"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {(() => {
                          if (isSubmitting) return "Saving...";
                          if (isBackgroundSaving) return "Syncing...";
                          return "Save Changes";
                        })()}
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

            {/* Created By Info for Admin */}
            {userRole === 'admin' && quotation?.staffId && (
              <Card>
                <CardHeader>
                  <CardTitle>Created By</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {typeof quotation.staffId === 'object' 
                        ? quotation.staffId.name 
                        : 'Unknown Staff'
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => navigate(`/${userRole}/quotations/${quotation?._id}/preview`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview PDF
                </Button>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={handleDownloadPDF}
                  disabled={pdfGenerating || isUploadingPDF}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {pdfGenerating || isUploadingPDF ? "Processing..." : "Download PDF"}
                </Button>
                
                {quotation?.status === 'draft' && (
                  <Button 
                    className="w-full"
                    onClick={() => handleStatusChange('sent')}
                  >
                    Mark as Sent
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          itemName="quotation"
          isLoading={isDeleting}
        />

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
                  id="product-name"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <Label htmlFor="product-description">Description (Optional)</Label>
                <Textarea
                  id="product-description"
                  value={newProductDescription}
                  onChange={(e) => setNewProductDescription(e.target.value)}
                  placeholder="Enter product description"
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateProductDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmCreateProduct}
                disabled={!newProductName.trim()}
              >
                Create Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
