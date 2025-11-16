import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { InteractionDialog } from "@/components/dialogs/interaction-dialog";
import { InteractionStatusDialog } from "@/components/dialogs/interaction-status-dialog";
import { useInteractionStore } from "@/store/interactionStore";
import { useLeadStore } from "@/store/leadStore";
import { useUserStore } from "@/store/admin/userStore";
import { Plus, Phone, Video, Calendar as CalendarIcon, MoreHorizontal, Filter, CheckCircle, XCircle, RotateCcw, Trash2, Search, X, User } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Interaction, CallStatus, InteractionType } from "@/lib/schema";

// Helper function to format date to local YYYY-MM-DD without timezone issues
const formatDateToLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// All available type and status options
const allTypes: { value: InteractionType; label: string }[] = [
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
];

const allStatuses: { value: CallStatus; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'missed', label: 'Missed' },
];

const FilterBar = ({
  selectedTypes,
  selectedStatuses,
  dateFrom,
  dateTo,
  selectedStaffId,
  staffMembers,
  filtersExpanded,
  handleTypeToggle,
  handleStatusToggle,
  clearAllFilters,
  setFiltersExpanded,
  handleDateFromChange,
  handleDateToChange,
  handleStaffChange
}: {
  selectedTypes: InteractionType[];
  selectedStatuses: CallStatus[];
  dateFrom: string;
  dateTo: string;
  selectedStaffId: string;
  staffMembers: Array<{ _id: string; name: string }>;
  filtersExpanded: boolean;
  handleTypeToggle: (type: InteractionType) => void;
  handleStatusToggle: (status: CallStatus) => void;
  clearAllFilters: () => void;
  setFiltersExpanded: (expanded: boolean) => void;
  handleDateFromChange: (date: string) => void;
  handleDateToChange: (date: string) => void;
  handleStaffChange: (staffId: string) => void;
  }) => (
  <div className="bg-card border border-border rounded-lg shadow-sm mb-4">
    {/* Filter Header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 pb-2 gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Filters</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs font-medium">
            {selectedTypes.length} type{selectedTypes.length !== 1 ? 's' : ''}
          </Badge>
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

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
        >
          {filtersExpanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>
    </div>

    {/* Filter Content - Collapsible */}
    {filtersExpanded && (
      <div className="p-3 sm:p-4 pt-2">
        <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-8">
          {/* Type Filters */}
          <div className="flex-1 w-full">
            <div className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
              Type
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
              {allTypes.map((type) => (
                <div key={type.value} className="flex items-center space-x-1.5">
                  <Checkbox
                    id={`type-${type.value}`}
                    checked={selectedTypes.includes(type.value)}
                    onCheckedChange={() => handleTypeToggle(type.value)}
                    className="h-3.5 w-3.5 cursor-pointer"
                  />
                  <label
                    htmlFor={`type-${type.value}`}
                      className={`text-xs text-muted-foreground cursor-pointer select-none whitespace-nowrap ${selectedTypes.includes(type.value)
                        ? 'text-red-600 font-medium'
                        : 'text-muted-foreground'
                        }`}
                  >
                    {type.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Status Filters */}
          <div className="flex-1 w-full">
            <div className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
              Status
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
              {allStatuses.map((status) => (
                <div key={status.value} className="flex items-center space-x-1.5">
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={selectedStatuses.includes(status.value)}
                    onCheckedChange={() => handleStatusToggle(status.value)}
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

          {/* Staff Filter - Only for Admin */}
          {staffMembers.length > 0 && (
            <div className="w-full lg:w-auto lg:flex-shrink-0">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Staff Member
              </div>
              <Select value={selectedStaffId} onValueChange={handleStaffChange}>
                <SelectTrigger className="h-8 text-xs font-normal w-full lg:w-48">
                  <SelectValue placeholder="All staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Staff">All staff</SelectItem>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff._id} value={staff._id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date Range Filter - Mobile Responsive */}
          <div className="w-full lg:w-auto lg:flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                Date Range
              </div>
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    handleDateFromChange("");
                    handleDateToChange("");
                  }}
                  className="h-5 px-1.5 text-xs text-gray-500 hover:text-gray-700"
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
                      className="h-8 text-xs w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {dateFrom ? new Date(dateFrom).toLocaleDateString() : "From date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[1000]" align="start" side="bottom" sideOffset={4}>
                    <Calendar
                      mode="single"
                      selected={dateFrom ? new Date(dateFrom) : undefined}
                      onSelect={(date) => handleDateFromChange(date ? formatDateToLocal(date) : '')}
                      disabled={(date) =>
                        date > new Date() || (dateTo ? date > new Date(dateTo) : false)
                      }
                      autoFocus={false}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <span className="text-xs text-gray-400 text-center sm:hidden">to</span>
              <span className="text-xs text-gray-400 hidden sm:inline">to</span>
              <div className="flex-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-8 text-xs w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {dateTo ? new Date(dateTo).toLocaleDateString() : "To date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[1000]" align="start" side="bottom" sideOffset={4}>
                    <Calendar
                      mode="single"
                      selected={dateTo ? new Date(dateTo) : undefined}
                      onSelect={(date) => handleDateToChange(date ? formatDateToLocal(date) : '')}
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
    )}
  </div>
);

interface InteractionsPageProps {
  userRole: 'admin' | 'staff';
  pageTitle: string;
  pageDescription: string;
  testId: string;
}

export default function InteractionsPage({
  userRole,
  pageTitle,
  pageDescription,
  testId
}: InteractionsPageProps) {
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [defaultType, setDefaultType] = useState<InteractionType>("call");
  const [targetStatus, setTargetStatus] = useState<'completed' | 'missed'>('completed');
  const [rescheduleMode, setRescheduleMode] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<InteractionType[]>(['call', 'meeting']);
  const [selectedStatuses, setSelectedStatuses] = useState<CallStatus[]>(['scheduled']);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const {
    interactions,
    loading,
    error,
    pagination,
    fetchInteractions,
    updateInteractionStatusOptimistic,
    deleteInteraction
  } = useInteractionStore();

  const { fetchLeads } = useLeadStore();
  const { users: staffMembers, fetchAllUsers } = useUserStore();
  const { toast } = useToast();

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

  // Fetch interactions when filters change
  useEffect(() => {
    const fetchData = async () => {
      const queryParams = {
        page: currentPage,
        limit: pageSize,
        type: selectedTypes.length > 0 ? selectedTypes.join(',') as "call" | "meeting" : undefined,
        status: selectedStatuses.length > 0 ? selectedStatuses.join(',') as any : undefined,
        search: debouncedSearchTerm || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        // Only add staffId filter for admin users
        ...(userRole === 'admin' && selectedStaffId ? { staffId: selectedStaffId } : {}),
      };
      await fetchInteractions(queryParams);
    };

    fetchData();
  }, [currentPage, pageSize, debouncedSearchTerm, selectedTypes, selectedStatuses, selectedStaffId, dateFrom, dateTo, fetchInteractions, userRole]);

  // Fetch leads on component mount
  useEffect(() => {
    fetchLeads({ limit: 1000 });
  }, [fetchLeads]);

  // Fetch staff members for admin users
  useEffect(() => {
    if (userRole === 'admin') {
      fetchAllUsers({ role: 'staff', limit: 1000 });
    }
  }, [userRole, fetchAllUsers]);

  const formatDateTime = (date: string | { iso: string; formatted: string }) => {
    const dateStr = typeof date === 'object' ? date.iso : date;
    const dateObj = new Date(dateStr);
    return {
      date: dateObj.toLocaleDateString(),
      time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const handleStatusChange = async (interaction: Interaction, newStatus: 'completed' | 'missed') => {
    setSelectedInteraction(interaction);
    setTargetStatus(newStatus);
    setStatusDialogOpen(true);
  };

  const handleDelete = async (interaction: Interaction) => {
    try {
      const success = await deleteInteraction(interaction._id);
      if (success) {
        toast({
          title: "Success",
          description: `${interaction.type === 'call' ? 'Call' : 'Meeting'} deleted successfully`,
        });
      }
    } catch (error) {
      console.error('Error deleting interaction:', error);
      toast({
        title: "Error",
        description: `Failed to delete ${interaction.type === 'call' ? 'call' : 'meeting'}`,
        variant: "destructive",
      });
    }
  };

  const handleReschedule = (interaction: Interaction) => {
    setSelectedInteraction(interaction);
    setRescheduleMode(true);
    setInteractionDialogOpen(true);
  };

  const handleScheduleInteraction = () => {
    setDefaultType("call"); // Always default to call
    setSelectedInteraction(null);
    setRescheduleMode(false);
    setInteractionDialogOpen(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  // Filter handlers
  const handleTypeToggle = (type: InteractionType) => {
    // if selectedTypes contains only one type and user tries to uncheck it, ignore
    // show toast like "At least one type must be selected"
    if (selectedTypes.length === 1 && selectedTypes[0] === type) {
      toast({
        title: "At least one type must be selected",
        variant: "destructive"
      });
      return;
    }

    setSelectedTypes(prev => {
      const newTypes = prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type];
      setCurrentPage(1);
      return newTypes;
    });
  };

  const handleStatusToggle = (status: CallStatus) => {
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
    setSelectedTypes(['call', 'meeting']);
    setSelectedStatuses(['scheduled']);
    setSelectedStaffId("");
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
    setSelectedStaffId(staffId === "All Staff" ? "" : staffId);
    setCurrentPage(1);
  };

  const handleStatusConfirm = async (interactionId: string, status: 'completed' | 'missed', notes: string) => {
    await updateInteractionStatusOptimistic(interactionId, status, notes);
  };

  const columns = [
    {
      key: 'type',
      header: 'Type',
      render: (value: InteractionType) => (
        <div className="flex items-center gap-2">
          {value === 'call' ? (
            <Phone className="h-4 w-4 text-blue-500" />
          ) : (
            <Video className="h-4 w-4 text-purple-500" />
          )}
          <span className="capitalize">{value}</span>
        </div>
      ),
    },
    {
      key: 'leadId',
      header: 'Lead',
      render: (_value: any, interaction: Interaction) => {
        const lead = typeof interaction.leadId === 'object' ? interaction.leadId : null;
        return lead ? (
          <div>
            <div className="text-sm font-medium text-foreground">{lead.name}</div>
            <div className="text-sm text-muted-foreground">{lead.location || 'No location'}</div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Unknown Lead</div>
        );
      },
      sortable: true,
    },
    {
      key: 'date',
      header: 'Date & Time',
      render: (_value: any, interaction: Interaction) => {
        const { date, time } = formatDateTime(interaction.date);
        return (
          <div>
            <div className="text-sm font-medium text-foreground">{date}</div>
            <div className="text-sm text-muted-foreground">{time}</div>
          </div>
        );
      },
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => (
        <StatusBadge status={value as any} type="call" />
      ),
    },
    // Add "Created By" column only for admin
    ...(userRole === 'admin' ? [{
      key: 'createdBy',
      header: 'Created By',
      render: (_value: any, interaction: Interaction) => {
        const createdBy = typeof interaction.staffId === 'object' ? interaction.staffId : null;
        return createdBy ? (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">{createdBy.name}</span>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Unknown</div>
        );
      },
      sortable: true,
    }] : []),
    {
      key: 'initialNotes',
      header: 'Initial Notes',
      render: (_value: any, interaction: Interaction) => (
        <div className="max-w-xs truncate">
          {interaction.initialNotes || 'No initial notes'}
        </div>
      ),
    },
    {
      key: 'remarks',
      header: 'Remarks',
      render: (value: string) => (
        <div className="max-w-xs truncate">
          {value || 'No remarks'}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (value: string) => {
        const date = new Date(value);
        return date.toLocaleDateString();
      },
    },
  ];

  const actions = (interaction: Interaction) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Status Change Actions - Only for scheduled interactions */}
        {interaction.status === 'scheduled' && (
          <>
            <DropdownMenuItem
              onClick={() => handleStatusChange(interaction, 'completed')}
              className="text-green-600 focus:text-green-600"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Completed
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleStatusChange(interaction, 'missed')}
              className="text-red-600 focus:text-red-600"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Mark as Missed
            </DropdownMenuItem>
          </>
        )}

        {/* Reschedule Action - For both missed and completed interactions and only if role is staff */}
        {(interaction.status === 'missed' || interaction.status === 'completed') && userRole === 'staff' && (
          <DropdownMenuItem
            onClick={() => handleReschedule(interaction)}
            className="text-blue-600 focus:text-blue-600"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reschedule {interaction.type === 'call' ? 'Call' : 'Meeting'}
          </DropdownMenuItem>
        )}

        {/* Delete Action - only if role is admin */}
        {(userRole === 'admin') && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDelete(interaction)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground">Error Loading Interactions</h2>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button onClick={() => fetchInteractions()} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8" data-testid={testId}>
        {/* Header Section - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">{pageTitle}</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              {pageDescription}
            </p>
          </div>
          
          {/* Search and Schedule - Mobile Stack */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search interactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 h-9 sm:h-10"
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
            {
              userRole === 'staff' && (
                <Button onClick={handleScheduleInteraction} className="h-9 sm:h-10 w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Schedule Call & Meeting</span>
                  <span className="sm:hidden">Schedule</span>
                </Button>
              )
            }
          </div>
        </div>

        <FilterBar
          selectedTypes={selectedTypes}
          selectedStatuses={selectedStatuses}
          dateFrom={dateFrom}
          dateTo={dateTo}
          selectedStaffId={selectedStaffId}
          staffMembers={staffMembers || []}
          filtersExpanded={filtersExpanded}
          handleTypeToggle={handleTypeToggle}
          handleStatusToggle={handleStatusToggle}
          clearAllFilters={clearAllFilters}
          setFiltersExpanded={setFiltersExpanded}
          handleDateFromChange={handleDateFromChange}
          handleDateToChange={handleDateToChange}
          handleStaffChange={handleStaffChange}
        />

        {/* Interactions Table */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <DataTable
              data={interactions || []}
              columns={columns}
              actions={actions}
              isLoading={loading}
              emptyMessage="No interactions found. Try adjusting your filters or schedule your first interaction."
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

        <InteractionDialog
          open={interactionDialogOpen}
          onOpenChange={setInteractionDialogOpen}
          interaction={selectedInteraction}
          defaultType={defaultType}
          rescheduleMode={rescheduleMode}
        />

        <InteractionStatusDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          interaction={selectedInteraction}
          newStatus={targetStatus}
          onConfirm={handleStatusConfirm}
        />
      </div>
    </DashboardLayout>
  );
}