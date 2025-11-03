import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { useQuotationStore } from "@/store/quotationStore";
import { useUserStore } from "@/store/admin/userStore";
import { getQuotationStatusColor, getQuotationStatusLabel, QuotationStatus } from "@/api/quotationApi";
import { Plus, Eye, MoreHorizontal, Download, Search, X, Filter, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmationDialog } from "@/components/dialogs/delete-confirmation-dialog";

// Helper function to format date to local YYYY-MM-DD without timezone issues
const formatDateToLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// FilterBar component
interface FilterBarProps {
  selectedStatuses: QuotationStatus[];
  onStatusToggle: (status: QuotationStatus) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onClearAll: () => void;
  filtersExpanded: boolean;
  onToggleExpanded: () => void;
  // Staff filter props (only for admin)
  selectedStaffId: string;
  staffMembers: Array<{ _id: string; name: string; branch?: string; role?: 'staff' | 'admin' }>;
  onStaffChange: (staffId: string) => void;
  // Branch filter props (only for admin)
  selectedBranch: string;
  onBranchChange: (branch: string) => void;
  userRole: 'admin' | 'staff';
}

const FilterBar: React.FC<Readonly<FilterBarProps>> = ({
  selectedStatuses,
  onStatusToggle,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClearAll,
  filtersExpanded,
  onToggleExpanded,
  selectedStaffId,
  staffMembers,
  onStaffChange,
  selectedBranch,
  onBranchChange,
  userRole,
}) => {
  const allStatuses: { value: QuotationStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm mb-4">
      {/* Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 pb-2 gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Filters</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs font-medium">
              {selectedStatuses.length} status{selectedStatuses.length !== 1 ? 'es' : ''}
            </Badge>
            {selectedStaffId && (
              <Badge variant="outline" className="text-xs font-medium">
                1 staff
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpanded}
            className="h-7 text-xs text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            {filtersExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </div>

      {/* Filter Content - Collapsible */}
      {filtersExpanded && (
        <div className="p-3 py-1">
          <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-8">
            {/* Status Filters */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Status
              </div>
              <div className="flex flex-wrap gap-3">
                {allStatuses.map((status) => (
                  <div key={status.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status.value}`}
                      checked={selectedStatuses.includes(status.value)}
                      onCheckedChange={() => onStatusToggle(status.value)}
                      className="h-3.5 w-3.5 cursor-pointer"
                    />
                    <label
                      htmlFor={`status-${status.value}`}
                      className={`text-xs text-muted-foreground cursor-pointer select-none whitespace-nowrap ${selectedStatuses.includes(status.value)
                        ? 'text-red-600 font-medium'
                        : 'text-muted-foreground'
                        }`}
                    >
                      {status.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-4 lg:gap-8">
              {/* Staff Filter - Only for Admin with smart filtering */}
              {userRole === 'admin' && staffMembers.length > 0 && (() => {
                let availableStaff = staffMembers;
                if (selectedBranch && selectedBranch !== 'All Branches') {
                  const admins = staffMembers.filter(s => s.role === 'admin');
                  const branchStaff = staffMembers.filter(s => s.role !== 'admin' && s.branch === selectedBranch);
                  availableStaff = [...admins, ...branchStaff];
                }
                return (
                  <div className="flex-shrink-0 min-w-0">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Staff Member
                    </div>
                    <Select value={selectedStaffId || 'ALL_STAFF'} onValueChange={onStaffChange}>
                      <SelectTrigger className="h-6 text-xs font-normal w-full sm:w-48">
                        <SelectValue placeholder="All staff" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL_STAFF">All staff</SelectItem>
                        {availableStaff.map((staff) => (
                          <SelectItem key={staff._id} value={staff._id}>
                            {`${staff.name} (${staff.role === 'admin' ? 'admin' : 'staff'}${staff.role !== 'admin' && staff.branch ? `, ${staff.branch}` : ''})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })()}

              {/* Branch Filter - Only for Admin with smart filtering */}
              {userRole === 'admin' && (() => {
                let availableBranches = ['All Branches', 'Bhubaneswar', 'Balasore'];
                if (selectedStaffId) {
                  const st = staffMembers.find(s => s._id === selectedStaffId);
                  if (st && st.role === 'admin') {
                    // Admin can see all branches, so keep all options
                    availableBranches = ['All Branches', 'Bhubaneswar', 'Balasore'];
                  } else if (st && st.branch) {
                    availableBranches = ['All Branches', st.branch];
                  }
                }
                return (
                  <div className="flex-shrink-0 min-w-0">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Branch
                    </div>
                    <Select value={selectedBranch} onValueChange={onBranchChange}>
                      <SelectTrigger className="h-6 text-xs font-normal w-full sm:w-48">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableBranches.includes('All Branches') && (
                          <SelectItem value="All Branches">All Branches</SelectItem>
                        )}
                        {availableBranches.includes('Bhubaneswar') && (
                          <SelectItem value="Bhubaneswar">Bhubaneswar</SelectItem>
                        )}
                        {availableBranches.includes('Balasore') && (
                          <SelectItem value="Balasore">Balasore</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })()}

              {/* Date Range Filter */}
              <div className="flex-shrink-0 w-full sm:w-auto min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                    Date Range
                  </div>
                  {(dateFrom || dateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onDateFromChange("");
                        onDateToChange("");
                      }}
                      className="h-5 px-1.5 text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-8 text-xs w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {dateFrom ? new Date(dateFrom).toLocaleDateString() : "From date"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[1000]" align="start" side="bottom" sideOffset={4}>
                        <Calendar
                          mode="single"
                          selected={dateFrom ? new Date(dateFrom) : undefined}
                          onSelect={(date) => onDateFromChange(date ? formatDateToLocal(date) : '')}
                          disabled={(date) =>
                            date > new Date() || (dateTo ? date > new Date(dateTo) : false)
                          }
                          autoFocus={false}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <span className="text-xs text-gray-400 text-center sm:text-left">to</span>
                  <div className="flex-1 min-w-0">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-8 text-xs w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {dateTo ? new Date(dateTo).toLocaleDateString() : "To date"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[1000]" align="start" side="bottom" sideOffset={4}>
                        <Calendar
                          mode="single"
                          selected={dateTo ? new Date(dateTo) : undefined}
                          onSelect={(date) => onDateToChange(date ? formatDateToLocal(date) : '')}
                          disabled={(date) =>
                            date > new Date() || (dateFrom ? date < new Date(dateFrom) : false)
                          }
                          autoFocus={false}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface QuotationsPageProps {
  userRole: 'admin' | 'staff';
  pageTitle: string;
  pageDescription: string;
  testId: string;
}

export default function QuotationsPage({
  userRole,
  pageTitle,
  pageDescription,
  testId
}: Readonly<QuotationsPageProps>) {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<QuotationStatus[]>(['draft', 'sent']);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("All Branches");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<string | null>(null);

  const {
    quotations,
    pagination,
    loading,
    error,
    fetchQuotations,
    updateQuotation,
    deleteQuotation,
    clearError,
    downloadQuotationPDF,
    pdfGenerating,
  } = useQuotationStore();

  const { users: staffMembers, fetchAllUsers } = useUserStore();
  const { user } = useAuthStore();

  // Debounced search with minimum 3 characters
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only search if there are at least 3 characters or the search is cleared
      if (searchTerm.length >= 3 || searchTerm.length === 0) {
        setDebouncedSearchTerm(searchTerm);
        setCurrentPage(1); // Reset to first page when searching
      }
    }, 450); // 450ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch quotations when filters change
  useEffect(() => {
    const fetchData = async () => {
      const queryParams = {
        page: currentPage,
        limit: pageSize,
        status: selectedStatuses,
        search: debouncedSearchTerm || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        // Only add staffId filter for admin users
        ...(userRole === 'admin' && selectedStaffId ? { staffId: selectedStaffId } : {}),
        // Only add branch filter for admin users when not "All Branches"
        ...(userRole === 'admin' && selectedBranch && selectedBranch !== "All Branches" ? { branch: selectedBranch } : {}),
      };
      await fetchQuotations(queryParams);
    };

    fetchData();
  }, [currentPage, pageSize, debouncedSearchTerm, selectedStatuses, selectedStaffId, selectedBranch, dateFrom, dateTo, fetchQuotations, userRole]);

  // Fetch staff members for admin users
  useEffect(() => {
    if (userRole === 'admin') {
      fetchAllUsers({ role: 'staff', limit: 1000 });
    }
  }, [userRole, fetchAllUsers]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(num);
  };

  // Filter handlers
  const handleStatusToggle = (status: QuotationStatus) => {
    // if selectedStatuses contains only one status and user tries to uncheck it, ignore
    // show toast like "At least one status must be selected"
    if (selectedStatuses.length === 1 && selectedStatuses[0] === status) {
      toast({
        title: "At least one status must be selected",
        variant: "destructive"
      });
      return;
    }

    setSelectedStatuses(prev => {
      const newStatuses = prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status];
      setCurrentPage(1);
      return newStatuses;
    });
  };

  const clearAllFilters = () => {
    setSelectedStatuses(['draft', 'sent']);
    setSelectedStaffId("");
    setSelectedBranch("All Branches");
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const handleDateFromChange = (date: string) => {
    setDateFrom(date);
    setCurrentPage(1);
  };

  const handleDateToChange = (date: string) => {
    setDateTo(date);
    setCurrentPage(1);
  };

  const handleStaffChange = (staffId: string) => {
    setSelectedStaffId(staffId === 'ALL_STAFF' ? '' : staffId);
    setCurrentPage(1);
  };

  const handleBranchChange = (branch: string) => {
    setSelectedBranch(branch);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };


  const handleViewQuotation = (quotation: any) => {
    navigate(`/${userRole}/quotations/${quotation._id}`);
  };

  const handleCreateNew = () => {
    navigate(`/${userRole}/quotations/new`);
  };

  const handleStatusUpdate = async (quotationId: string, newStatus: string) => {
    try {
      await updateQuotation(quotationId, { status: newStatus as any });
      toast({
        description: `Quotation status updated to ${getQuotationStatusLabel(newStatus as any)}`,
      });
    } catch (error) {
      console.error('Failed to update quotation status:', error);
      toast({
        title: "Error",
        description: "Failed to update quotation status",
        variant: "destructive",
      });
    }
  };


  const handleDeleteQuotation = (quotationId: string) => {
    setQuotationToDelete(quotationId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!quotationToDelete) return;

    setIsDeleting(true);
    try {
      const success = await deleteQuotation(quotationToDelete);
      if (success) {
        toast({
          title: "Success",
          description: "Quotation deleted successfully",
        });

        // Refresh the data after deletion
        const queryParams = {
          page: currentPage,
          limit: pageSize,
          status: selectedStatuses,
          search: debouncedSearchTerm || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          // Only add staffId filter for admin users
          ...(userRole === 'admin' && selectedStaffId ? { staffId: selectedStaffId } : {}),
        };
        await fetchQuotations(queryParams);
      }
    } catch (error) {
      console.error('Failed to delete quotation:', error);
      toast({
        title: "Error",
        description: "Failed to delete quotation",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setQuotationToDelete(null);
    }
  };

  const handleDownloadPDF = async (quotation: any) => {
    try {
      const success = await downloadQuotationPDF(quotation);
      if (success) {
        toast({
          description: "PDF downloaded successfully",
        });
      }
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive",
      });
    }
  };

  const baseColumns = [
    {
      key: 'quotationNo',
      header: 'Quote #',
      render: (value: string) => (
        <div className="text-sm font-mono font-medium text-foreground">{value}</div>
      ),
      sortable: true,
    },
    {
      key: 'leadId',
      header: 'Lead',
      render: (value: any) => {
        return value ? (
          <div>
            <div className="text-sm font-medium text-foreground">{value.name}</div>
            <div className="text-sm text-muted-foreground">{value.email}</div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Unknown Lead</div>
        );
      },
      sortable: true,
    },
    // {
    //   key: 'staffId',
    //   header: 'Staff',
    //   render: (value: any) => {
    //     return value ? (
    //       <div>
    //         <div className="text-sm font-medium text-foreground">{value.name}</div>
    //         <div className="text-sm text-muted-foreground">{value.role}</div>
    //       </div>
    //     ) : (
    //       <div className="text-sm text-muted-foreground">Unassigned</div>
    //     );
    //   },
    //   sortable: true,
    // },
    {
      key: 'grandTotal',
      header: 'Amount',
      render: (value: number) => (
        <div className="text-sm font-medium text-foreground">
          {formatCurrency(value)}
        </div>
      ),
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getQuotationStatusColor(value as any)}`}>
          {getQuotationStatusLabel(value as any)}
        </span>
      ),
    },
    ...(userRole === 'admin' ? [{
      key: 'leadId',
      header: 'Branch',
      render: (_value: any, quotation: any) => {
        const lead = quotation.leadId;
        return lead?.branch ? (
          <div className="text-sm text-foreground">{lead.branch}</div>
        ) : (
          <div className="text-sm text-muted-foreground">Unknown</div>
        );
      },
      sortable: true,
    }] : []),
    {
      key: 'date',
      header: 'Date',
      render: (value: string) => {
        if (!value) return 'No date';
        const date = new Date(value);
        return (
          <div className="text-sm text-foreground">
            {date.toLocaleDateString()}
          </div>
        );
      },
      sortable: true,
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      render: (value: string) => new Date(value).toLocaleDateString(),
      sortable: true,
    },
  ];

  // Add "Created By" column only for admin
  const adminCreatedByColumn = {
    key: 'createdBy',
    header: 'Created By',
    render: (_value: any, quotation: any) => {
      const createdBy = typeof quotation.staffId === 'object' ? quotation.staffId : null;
      return createdBy ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">{createdBy.name}</span>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">Unknown</div>
      );
    },
    sortable: true,
  };

  const columns = (userRole === 'admin' || userRole === 'staff') ? [adminCreatedByColumn, ...baseColumns] : baseColumns;

  const actions = (quotation: any) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" data-testid={`quotation-actions-${quotation._id}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleViewQuotation(quotation)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/staff/quotations/${quotation._id}/preview`)}>
          <Eye className="mr-2 h-4 w-4" />
          Preview PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleDownloadPDF(quotation)}
          disabled={pdfGenerating}
        >
          <Download className="mr-2 h-4 w-4" />
          {pdfGenerating ? 'Generating...' : 'Download PDF'}
        </DropdownMenuItem>
        {/* <DropdownMenuItem onClick={() => handleSendEmail(quotation)}>
          <Mail className="mr-2 h-4 w-4" />
          Send Email
        </DropdownMenuItem> */}
        {quotation.status === 'draft' && (
          <DropdownMenuItem onClick={() => handleStatusUpdate(quotation._id, 'sent')}>
            Mark as Sent
          </DropdownMenuItem>
        )}
        {quotation.status === 'sent' && (
          <>
            <DropdownMenuItem onClick={() => handleStatusUpdate(quotation._id, 'accepted')}>
              Mark as Accepted
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusUpdate(quotation._id, 'rejected')}>
              Mark as Rejected
            </DropdownMenuItem>
          </>
        )}
        {/* Delete Action - only if role is admin */}
        {userRole === 'admin' && (
          <DropdownMenuItem
            onClick={() => handleDeleteQuotation(quotation._id)}
            className="text-destructive"
          >
            Delete Quotation
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Loading state
  if (loading && quotations.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Table Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-1 sm:p-2 lg:p-3" data-testid={testId}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{pageTitle}</h1>
            <p className="text-muted-foreground mt-2">
              {pageDescription}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quotations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 w-full"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button onClick={handleCreateNew} data-testid="create-quotation-button" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Quotation
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FilterBar
          selectedStatuses={selectedStatuses}
          onStatusToggle={handleStatusToggle}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={handleDateFromChange}
          onDateToChange={handleDateToChange}
          onClearAll={clearAllFilters}
          filtersExpanded={filtersExpanded}
          onToggleExpanded={() => setFiltersExpanded(!filtersExpanded)}
          selectedStaffId={selectedStaffId}
          staffMembers={(userRole === 'admin' && user) ? ([{ _id: user.id, name: user.name || 'Admin', role: 'admin' as 'admin' }, ...(staffMembers || [])] as any) : (staffMembers || [])}
          onStaffChange={handleStaffChange}
          selectedBranch={selectedBranch}
          onBranchChange={handleBranchChange}
          userRole={userRole}
        />

        {/* Quotations Table */}
        <Card>
          <CardContent>
            <DataTable
              data={quotations || []}
              columns={columns}
              actions={actions}
              isLoading={loading}
              emptyMessage="No quotations found. Try adjusting your filters or create your first quotation."
              serverSide={true}
              currentPage={pagination?.currentPage || 1}
              totalPages={pagination?.totalPages || 1}
              pageSize={pagination?.itemsPerPage || 10}
              totalItems={pagination?.totalItems || 0}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              showPageSizeSelector={true}
            />
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          title="Delete Quotation"
          description="Are you sure you want to delete this quotation? This action cannot be undone."
          itemName={quotationToDelete || ""}
          itemType="quotation"
          isLoading={isDeleting}
        />
      </div>
    </DashboardLayout>
  );
}
