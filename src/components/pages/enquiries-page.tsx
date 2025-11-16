import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { useEnquiryStore } from "@/store/enquiryStore";
import type { Enquiry, EnquiryQueryParams } from "@/api/enquiryApi";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, MoreHorizontal, Search, X, Filter, ArrowRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmationDialog } from "@/components/dialogs/delete-confirmation-dialog";
import { EnquiryDialog } from "@/components/dialogs/enquiry-dialog";
import { ConvertEnquiryDialog } from "@/components/dialogs/convert-enquiry-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Helper function to format date to local YYYY-MM-DD
const formatDateToLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface EnquiriesPageProps {
  readonly userRole: 'admin' | 'staff';
  readonly pageTitle: string;
  readonly pageDescription: string;
  readonly testId: string;
}

export default function EnquiriesPage({
  userRole,
  pageTitle,
  pageDescription,
  testId
}: EnquiriesPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [enquiryToDelete, setEnquiryToDelete] = useState<Enquiry | null>(null);
  const [enquiryDialogOpen, setEnquiryDialogOpen] = useState(false);
  const [enquiryToEdit, setEnquiryToEdit] = useState<Enquiry | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [enquiryToConvert, setEnquiryToConvert] = useState<Enquiry | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const {
    enquiries,
    loading,
    error,
    pagination,
    fetchEnquiries,
    deleteEnquiry,
    clearError,
  } = useEnquiryStore();

  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch enquiries on component mount and when filters change
  useEffect(() => {
    const fetchData = async () => {
      const queryParams: EnquiryQueryParams = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearchTerm || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };

      await fetchEnquiries(queryParams);
    };

    fetchData();
  }, [currentPage, pageSize, debouncedSearchTerm, dateFrom, dateTo, fetchEnquiries]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 3 || searchTerm.length === 0) {
        setDebouncedSearchTerm(searchTerm);
        setCurrentPage(1);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
      clearError();
    }
  }, [error, toast, clearError]);

  const handleCreate = () => {
    setEnquiryToEdit(null);
    setDialogMode('create');
    setEnquiryDialogOpen(true);
  };

  const handleEdit = (enquiry: Enquiry) => {
    setEnquiryToEdit(enquiry);
    setDialogMode('edit');
    setEnquiryDialogOpen(true);
  };

  const handleDelete = (enquiry: Enquiry) => {
    setEnquiryToDelete(enquiry);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!enquiryToDelete) return;

    setIsDeleting(true);
    try {
      const success = await deleteEnquiry(enquiryToDelete._id);
      if (success) {
        toast({
          title: "Success",
          description: "Enquiry deleted successfully",
        });
        setDeleteDialogOpen(false);
        setEnquiryToDelete(null);
        
        // Refresh enquiries
        const queryParams: EnquiryQueryParams = {
          page: currentPage,
          limit: pageSize,
          search: debouncedSearchTerm || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        };
        await fetchEnquiries(queryParams);
      } else {
        toast({
          title: "Error",
          description: "Failed to delete enquiry",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete enquiry",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConvert = (enquiry: Enquiry) => {
    setEnquiryToConvert(enquiry);
    setConvertDialogOpen(true);
  };

  const handleDialogClose = (success: boolean) => {
    setEnquiryDialogOpen(false);
    setEnquiryToEdit(null);
    if (success) {
      toast({
        title: "Success",
        description: dialogMode === 'create' ? "Enquiry created successfully" : "Enquiry updated successfully",
      });
      
      // Refresh enquiries
      const queryParams: EnquiryQueryParams = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearchTerm || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };
      fetchEnquiries(queryParams);
    }
  };

  const handleConvertDialogClose = () => {
    setConvertDialogOpen(false);
    setEnquiryToConvert(null);
    
    // Refresh enquiries after conversion
    const queryParams: EnquiryQueryParams = {
      page: currentPage,
      limit: pageSize,
      search: debouncedSearchTerm || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };
    fetchEnquiries(queryParams);
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const columns = [
    {
      key: 'customer.name',
      header: 'Customer Name',
      render: (value: string, enquiry: Enquiry) => (
        <div className="font-medium">{enquiry.customer?.name || 'N/A'}</div>
      ),
      sortable: true,
    },
    {
      key: 'customer.mobile',
      header: 'Mobile',
      render: (value: string, enquiry: Enquiry) => (
        <span className="font-mono text-sm">{enquiry.customer?.mobile || 'N/A'}</span>
      ),
    },
    {
      key: 'customer.email',
      header: 'Email',
      render: (value: string, enquiry: Enquiry) => (
        <span className="text-sm">{enquiry.customer?.email || 'N/A'}</span>
      ),
    },
    {
      key: 'typesOfEvent',
      header: 'Events',
      render: (value: any, enquiry: Enquiry) => (
        <div className="flex flex-wrap gap-1">
          {enquiry.typesOfEvent?.map((event, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {event.name} ({event.numberOfGuests})
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created At',
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {value ? format(new Date(value), 'MMM dd, yyyy') : 'N/A'}
        </span>
      ),
      sortable: true,
    },
  ];

  const actions = (enquiry: Enquiry) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleConvert(enquiry)}>
          <ArrowRight className="h-4 w-4 mr-2" />
          Convert to Lead
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleEdit(enquiry)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        {userRole === 'admin' && (
          <DropdownMenuItem
            onClick={() => handleDelete(enquiry)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8" data-testid={testId}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">{pageTitle}</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {pageDescription}
            </p>
          </div>
          <Button onClick={handleCreate} className="mt-4 sm:mt-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Enquiry
          </Button>
        </div>

        {/* Filter Bar */}
        <Card>
          <CardContent className="p-2 sm:p-3 pb-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Filters</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(dateFrom || dateTo) && (
                    <Badge variant="outline" className="text-xs font-medium">
                      Date Range
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(dateFrom || dateTo || searchTerm) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear Filters
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showFilters ? 'Collapse' : 'Expand'}
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="flex flex-col sm:flex-row items-start gap-4 pb-2">
                <div className="flex-1 w-full">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Search
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, mobile, email, address..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="flex-1 w-full">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Date From
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateFrom && "text-muted-foreground"
                        )}
                      >
                        {dateFrom ? format(new Date(dateFrom), "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateFrom ? new Date(dateFrom) : undefined}
                        onSelect={(date) => setDateFrom(date ? formatDateToLocal(date) : '')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex-1 w-full">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Date To
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateTo && "text-muted-foreground"
                        )}
                      >
                        {dateTo ? format(new Date(dateTo), "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateTo ? new Date(dateTo) : undefined}
                        onSelect={(date) => setDateTo(date ? formatDateToLocal(date) : '')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enquiries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Enquiries</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={enquiries}
              columns={columns}
              searchKey="customer.name"
              searchPlaceholder="Search enquiries..."
              actions={actions}
              isLoading={loading}
              pagination={pagination ? {
                currentPage: pagination.currentPage,
                totalPages: pagination.totalPages,
                totalItems: pagination.totalItems,
                itemsPerPage: pagination.itemsPerPage,
                onPageChange: (page: number) => setCurrentPage(page),
                onPageSizeChange: (size: number) => {
                  setPageSize(size);
                  setCurrentPage(1);
                },
              } : undefined}
              emptyMessage="No enquiries found. Create your first enquiry to get started."
            />
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <EnquiryDialog
          open={enquiryDialogOpen}
          onOpenChange={handleDialogClose}
          enquiry={enquiryToEdit}
          mode={dialogMode}
        />

        {/* Convert Enquiry Dialog */}
        <ConvertEnquiryDialog
          open={convertDialogOpen}
          onOpenChange={handleConvertDialogClose}
          enquiry={enquiryToConvert}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          title="Delete Enquiry"
          description="Are you sure you want to delete this enquiry? This action cannot be undone."
          itemName={enquiryToDelete ? enquiryToDelete.customer?.name : ""}
          itemType="enquiry"
          isLoading={isDeleting}
        />
      </div>
    </DashboardLayout>
  );
}

