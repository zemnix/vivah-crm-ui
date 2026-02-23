import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar as CalendarIcon, Download, Eye, Filter, MoreHorizontal, Plus, Search, X } from "lucide-react";

import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DeleteConfirmationDialog } from "@/components/dialogs/delete-confirmation-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { useQuotationStore } from "@/store/quotationStore";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/admin/userStore";
import { useToast } from "@/hooks/use-toast";
import {
  getQuotationStatusColor,
  getQuotationStatusLabel,
  type Quotation,
  type QuotationQueryParams,
  type QuotationStatus,
} from "@/api/quotationApi";

interface QuotationsPageProps {
  readonly userRole: "admin" | "staff";
  readonly pageTitle: string;
  readonly pageDescription: string;
  readonly testId: string;
}

const ALL_STATUSES: QuotationStatus[] = ["draft", "sent", "accepted", "rejected"];
const SEARCH_DEBOUNCE_MS = 450;

const STATUS_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  draft: ["sent"],
  sent: ["accepted", "rejected"],
  accepted: [],
  rejected: [],
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
};

const formatDate = (value?: string): string => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString();
};

const formatDateToLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function QuotationsPage({
  userRole,
  pageTitle,
  pageDescription,
  testId,
}: Readonly<QuotationsPageProps>) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const { users: staffMembers, fetchAllUsers } = useUserStore();

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

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<QuotationStatus[]>(ALL_STATUSES);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<Quotation | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [searchTerm]);

  const buildQueryParams = (overrides?: Partial<QuotationQueryParams>): QuotationQueryParams => ({
    page: currentPage,
    limit: pageSize,
    status: selectedStatuses,
    search: debouncedSearchTerm || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    ...(userRole === "admin" && selectedStaffId ? { staffId: selectedStaffId } : {}),
    ...(userRole === "staff" && user?.id ? { staffId: user.id } : {}),
    ...overrides,
  });

  useEffect(() => {
    if (userRole === "staff" && !user?.id) {
      return;
    }

    void fetchQuotations(buildQueryParams());
  }, [
    currentPage,
    pageSize,
    debouncedSearchTerm,
    selectedStatuses,
    selectedStaffId,
    dateFrom,
    dateTo,
    userRole,
    user?.id,
    fetchQuotations,
  ]);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  useEffect(() => {
    if (userRole !== "admin") {
      return;
    }

    void fetchAllUsers({ role: "staff", limit: 1000 }).catch((staffFetchError) => {
      console.error("Failed to fetch staff members:", staffFetchError);
    });
  }, [userRole, fetchAllUsers]);

  const statusOptions = useMemo(
    () =>
      ALL_STATUSES.map((status) => ({
        value: status,
        label: getQuotationStatusLabel(status),
      })),
    []
  );

  const createdByOptions = useMemo(() => {
    if (userRole !== "admin") {
      return [];
    }

    const options: Array<{ value: string; label: string }> = [
      { value: "ALL_STAFF", label: "All staff" },
    ];

    if (user?.id) {
      options.push({
        value: user.id,
        label: user.name ? `${user.name} (Admin)` : "Current user (Admin)",
      });
    }

    staffMembers.forEach((staff) => {
      if (staff._id !== user?.id) {
        options.push({ value: staff._id, label: staff.name });
      }
    });

    return options;
  }, [userRole, user?.id, user?.name, staffMembers]);

  const columns = useMemo(() => {
    const sharedColumns = [
      {
        key: "quotationNo",
        header: "Quote #",
        render: (quotationNo: string) => <span className="font-mono font-medium">{quotationNo || "-"}</span>,
      },
      {
        key: "customer",
        header: "Customer",
        render: (customer: Quotation["customer"], quotation: Quotation) => (
          <div className="space-y-0.5">
            <div className="font-medium">{customer?.name || quotation.leadId?.name || "Unknown"}</div>
            <div className="text-xs text-muted-foreground">{customer?.mobile || "No mobile"}</div>
          </div>
        ),
      },
      {
        key: "leadId",
        header: "Lead",
        render: (lead: Quotation["leadId"]) => (
          <div className="space-y-0.5">
            <div className="font-medium">{lead?.name || "Unknown lead"}</div>
            <div className="text-xs text-muted-foreground">{lead?.email || "No email"}</div>
          </div>
        ),
      },
      {
        key: "grandTotal",
        header: "Amount",
        render: (grandTotal: number) => <span className="font-medium">{formatCurrency(grandTotal)}</span>,
      },
      {
        key: "status",
        header: "Status",
        render: (status: QuotationStatus) => (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getQuotationStatusColor(status)}`}>
            {getQuotationStatusLabel(status)}
          </span>
        ),
      },
      {
        key: "updatedAt",
        header: "Updated",
        render: (updatedAt: string) => formatDate(updatedAt),
      },
    ];

    if (userRole === "admin") {
      return [
        {
          key: "staffId",
          header: "Created By",
          render: (staff: Quotation["staffId"]) => (
            <div className="space-y-0.5">
              <div className="font-medium">{staff?.name || "Unknown"}</div>
              <div className="text-xs text-muted-foreground">{staff?.email || "No email"}</div>
            </div>
          ),
        },
        ...sharedColumns,
      ];
    }

    return sharedColumns;
  }, [userRole]);

  const toggleStatus = (status: QuotationStatus) => {
    setSelectedStatuses((current) => {
      const exists = current.includes(status);
      if (exists && current.length === 1) {
        toast({
          title: "At least one status is required",
          variant: "destructive",
        });
        return current;
      }

      const next = exists ? current.filter((value) => value !== status) : [...current, status];
      setCurrentPage(1);
      return next;
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setSelectedStatuses(ALL_STATUSES);
    setSelectedStaffId("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const handleStatusUpdate = async (quotation: Quotation, status: QuotationStatus) => {
    try {
      await updateQuotation(quotation._id, { status });
      toast({
        description: `Quotation marked as ${getQuotationStatusLabel(status)}.`,
      });
      await fetchQuotations(buildQueryParams());
    } catch (updateError) {
      console.error("Failed to update quotation status:", updateError);
      toast({
        title: "Error",
        description: "Could not update quotation status.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPdf = async (quotation: Quotation) => {
    const ok = await downloadQuotationPDF(quotation);
    if (!ok) {
      toast({
        title: "Error",
        description: "Failed to download PDF.",
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (quotation: Quotation) => {
    setQuotationToDelete(quotation);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!quotationToDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      const ok = await deleteQuotation(quotationToDelete._id);
      if (!ok) {
        throw new Error("Delete failed");
      }

      toast({
        description: "Quotation deleted successfully.",
      });

      if (quotations.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1);
      } else {
        await fetchQuotations(buildQueryParams());
      }
    } catch (deleteError) {
      console.error("Failed to delete quotation:", deleteError);
      toast({
        title: "Error",
        description: "Failed to delete quotation.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setQuotationToDelete(null);
    }
  };

  const actions = (quotation: Quotation) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" data-testid={`quotation-actions-${quotation._id}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => navigate(`/${userRole}/quotations/${quotation._id}`)}>
          <Eye className="mr-2 h-4 w-4" />
          View details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/${userRole}/quotations/${quotation._id}/preview`)}>
          <Eye className="mr-2 h-4 w-4" />
          Preview PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownloadPdf(quotation)} disabled={pdfGenerating}>
          <Download className="mr-2 h-4 w-4" />
          {pdfGenerating ? "Generating..." : "Download PDF"}
        </DropdownMenuItem>

        {STATUS_TRANSITIONS[quotation.status].length > 0 && <DropdownMenuSeparator />}
        {STATUS_TRANSITIONS[quotation.status].map((nextStatus) => (
          <DropdownMenuItem
            key={nextStatus}
            onClick={() => {
              void handleStatusUpdate(quotation, nextStatus);
            }}
          >
            Mark as {getQuotationStatusLabel(nextStatus)}
          </DropdownMenuItem>
        ))}

        {userRole === "admin" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(quotation)}>
              Delete quotation
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6" data-testid={testId}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{pageTitle}</h1>
            <p className="mt-2 text-muted-foreground">{pageDescription}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search quotations"
                className="pl-9 pr-9"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear quotation search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button onClick={() => navigate(`/${userRole}/quotations/new`)} data-testid="create-quotation-button">
              <Plus className="mr-2 h-4 w-4" />
              New Quotation
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-card border border-border rounded-lg p-2 sm:p-3 pb-1 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Filters</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs font-medium">
                  {selectedStatuses.length} status{selectedStatuses.length !== 1 ? "es" : ""}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters((prev) => !prev)}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                {showFilters ? "Collapse" : "Expand"}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-6">
              <div className="flex-1 w-full">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Quotation Status
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:flex xl:flex-wrap gap-2 lg:gap-3">
                  {statusOptions.map((option) => {
                    const active = selectedStatuses.includes(option.value);
                    return (
                      <div key={option.value} className="flex items-center space-x-1.5">
                        <Checkbox
                          id={`quotation-status-${option.value}`}
                          checked={active}
                          onCheckedChange={() => toggleStatus(option.value)}
                          className="h-3.5 w-3.5 cursor-pointer"
                        />
                        <label
                          htmlFor={`quotation-status-${option.value}`}
                          className={`text-xs cursor-pointer select-none whitespace-nowrap ${
                            active ? "text-red-600 font-medium" : "text-muted-foreground"
                          }`}
                        >
                          {option.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {userRole === "admin" && (
                <div className="w-full lg:w-auto lg:flex-shrink-0">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Created By
                  </div>
                  <Select
                    value={selectedStaffId || "ALL_STAFF"}
                    onValueChange={(value) => {
                      setSelectedStaffId(value === "ALL_STAFF" ? "" : value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs font-normal w-full lg:w-48">
                      <SelectValue placeholder="All staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {createdByOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="w-full lg:w-auto lg:flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Date Range
                  </div>
                  {(dateFrom || dateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDateFrom("");
                        setDateTo("");
                        setCurrentPage(1);
                      }}
                      className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-8 text-xs w-full sm:w-36 justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {dateFrom ? new Date(dateFrom).toLocaleDateString() : "From date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[1000]" align="start" side="bottom" sideOffset={4}>
                        <Calendar
                          mode="single"
                          selected={dateFrom ? new Date(dateFrom) : undefined}
                          onSelect={(date) => {
                            setDateFrom(date ? formatDateToLocal(date) : "");
                            setCurrentPage(1);
                          }}
                          disabled={(date) => date > new Date() || (dateTo ? date > new Date(dateTo) : false)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <span className="text-xs text-gray-400 text-center sm:text-left">to</span>
                  <div className="flex-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-8 text-xs w-full sm:w-36 justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {dateTo ? new Date(dateTo).toLocaleDateString() : "To date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[1000]" align="start" side="bottom" sideOffset={4}>
                        <Calendar
                          mode="single"
                          selected={dateTo ? new Date(dateTo) : undefined}
                          onSelect={(date) => {
                            setDateTo(date ? formatDateToLocal(date) : "");
                            setCurrentPage(1);
                          }}
                          disabled={(date) => date > new Date() || (dateFrom ? date < new Date(dateFrom) : false)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <DataTable
              data={quotations}
              columns={columns}
              actions={actions}
              isLoading={loading && quotations.length === 0}
              emptyMessage="No quotations found. Try adjusting your filters or create a new quotation."
              serverSide
              currentPage={pagination?.currentPage || currentPage}
              totalPages={pagination?.totalPages || 1}
              pageSize={pagination?.itemsPerPage || pageSize}
              totalItems={pagination?.totalItems || 0}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              showPageSizeSelector
            />
          </CardContent>
        </Card>

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={() => {
            void handleConfirmDelete();
          }}
          title="Delete Quotation"
          description="Are you sure you want to delete this quotation? This action cannot be undone."
          itemName={quotationToDelete?._id}
          itemType="quotation"
          isLoading={isDeleting}
        />
      </div>
    </DashboardLayout>
  );
}
