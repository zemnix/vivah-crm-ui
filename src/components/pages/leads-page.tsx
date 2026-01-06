import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { InteractionDialog } from "@/components/dialogs/interaction-dialog";
import { useLeadStore } from "@/store/leadStore";
import { useUserStore } from "@/store/admin/userStore";
import type { User } from "@/api/userApi";
import type { Lead, LeadStatus, LeadQueryParams } from "@/api/leadApi";
import { updateLeadApi, getLeadName, getLeadMobile, getLeadEmail, getLeadLocation } from "@/api/leadApi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Phone, Calendar as CalendarIcon, FileText, MoreHorizontal, Search, X, Filter, Plus, Trash2, User as UserIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { DeleteConfirmationDialog } from "@/components/dialogs/delete-confirmation-dialog";
import { AssignLeadDialog } from "@/components/dialogs/assign-lead-dialog";
import { LeadDialog } from "@/components/dialogs/lead-dialog";
import { LeadEditDialog } from "@/components/dialogs/lead-edit-dialog";
import { cn } from "@/lib/utils";

// Helper function to format date to local YYYY-MM-DD without timezone issues
const formatDateToLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Define allowed status transitions
const ALLOWED_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  'new': ['follow_up', 'not_interested'],
  'follow_up': ['not_interested', 'quotation_sent', 'converted', 'lost'],
  'not_interested': [], // Terminal status
  'quotation_sent': ['follow_up', 'converted', 'lost'],
  'converted': [], // Terminal status
  'lost': [], // Terminal status
};

interface LeadsPageProps {
  readonly userRole: 'admin' | 'staff';
  readonly pageTitle: string;
  readonly pageDescription: string;
  readonly testId: string;
  readonly initialStatus?: LeadStatus | LeadStatus[]; // Optional initial status filter
}

interface DraggableLeadCardProps {
  lead: Lead;
  onCall: (lead: Lead) => void;
  onMeeting: (lead: Lead) => void;
  onQuotation: (lead: Lead) => void;
  onWhatsApp: (lead: Lead, e?: React.MouseEvent) => void;
  onView: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
  onAssign?: (lead: Lead) => void;
  isUpdating?: boolean;
  userRole: 'admin' | 'staff';
}

const DraggableLeadCard = ({
  lead,
  onCall,
  onMeeting,
  onQuotation,
  onWhatsApp,
  onView,
  isUpdating = false,
  userRole,
}: DraggableLeadCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead._id,
    disabled: isUpdating, // Disable dragging while updating
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : isUpdating ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        !isUpdating ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed',
        'hover:shadow-md transition-all duration-200 ease-in-out',
        'bg-card border border-border hover:border-border',
        isDragging ? 'shadow-xl rotate-1 scale-102' : 'hover:scale-[1.01]',
        isUpdating ? 'ring-1 ring-blue-200 ring-opacity-50' : ''
      )}
      onClick={() => !isUpdating && onView(lead)}
      {...(!isUpdating ? attributes : {})}
      {...(!isUpdating ? listeners : {})}
    >
      <CardContent className="p-2 sm:p-3">
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between">
              <h5 className="font-medium text-foreground text-xs sm:text-sm leading-tight truncate pr-1">{getLeadName(lead)}</h5>
              {isUpdating && (
                <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {getLeadLocation(lead) || 'No location'}
            </p>
            {userRole === 'admin' && (
              <p className="text-xs text-muted-foreground truncate">
                Assigned to: {lead.assignedTo ? lead.assignedTo.name : 'Unassigned'}
              </p>
            )}
          </div>

          {getLeadMobile(lead) && (
            <p className="text-xs text-muted-foreground font-mono bg-muted px-1 py-0.5 rounded text-center">
              {getLeadMobile(lead)}
            </p>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-border">
            <div className="flex items-center gap-1 flex-wrap">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCall(lead);
                      }}
                      className="h-6 w-6 sm:h-5 sm:w-5 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                      disabled={isUpdating}
                    >
                      <Phone className="h-3 w-3 sm:h-2.5 sm:w-2.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Call</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMeeting(lead);
                      }}
                      className="h-6 w-6 sm:h-5 sm:w-5 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950"
                      disabled={isUpdating}
                    >
                      <CalendarIcon className="h-3 w-3 sm:h-2.5 sm:w-2.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Meeting</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuotation(lead);
                      }}
                      className="h-6 w-6 sm:h-5 sm:w-5 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
                      disabled={isUpdating}
                    >
                      <FileText className="h-3 w-3 sm:h-2.5 sm:w-2.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Quote</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onWhatsApp(lead, e);
                      }}
                      className="h-6 w-6 sm:h-5 sm:w-5 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                      disabled={isUpdating}
                    >
                      <FaWhatsapp className="h-3 w-3 sm:h-2.5 sm:w-2.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>WhatsApp</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface DroppableColumnProps {
  title: string;
  status: LeadStatus;
  leads: Lead[];
  onCall: (lead: Lead) => void;
  onMeeting: (lead: Lead) => void;
  onQuotation: (lead: Lead) => void;
  onWhatsApp: (lead: Lead, e?: React.MouseEvent) => void;
  onView: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
  onAssign?: (lead: Lead) => void;
  updatingLeads: Set<string>;
  userRole: 'admin' | 'staff';
}

const DroppableColumn = ({
  title,
  status,
  leads,
  onCall,
  onMeeting,
  onQuotation,
  onWhatsApp,
  onView,
  onDelete,
  onAssign,
  updatingLeads,
  userRole,
}: DroppableColumnProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-2">
        <h4 className="font-semibold text-foreground text-sm uppercase tracking-wide">{title}</h4>
        <span className="text-xs text-muted-foreground bg-card px-2 py-1 rounded-full border border-border shadow-sm">
          {leads.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`
          flex-1 p-2 rounded-lg transition-all duration-200 ease-in-out overflow-y-auto scrollbar-hide
          ${isOver
            ? 'bg-blue-50 dark:bg-blue-950 border-2 border-blue-300 dark:border-blue-700 border-dashed shadow-inner'
            : 'bg-muted/30 border border-border'
          }
        `}
        style={{
          maxHeight: '50vh',
          minHeight: '250px',
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none' /* IE and Edge */
        }}
      >
        <SortableContext
          items={leads.map(lead => lead._id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {leads.map((lead) => (
              <DraggableLeadCard
                key={lead._id}
                lead={lead}
                onCall={onCall}
                onMeeting={onMeeting}
                onQuotation={onQuotation}
                onWhatsApp={onWhatsApp}
                onView={onView}
                onDelete={onDelete}
                onAssign={onAssign}
                isUpdating={updatingLeads.has(lead._id)}
                userRole={userRole}
              />
            ))}
            {leads.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {isOver ? 'Drop lead here' : 'No leads'}
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};

export default function LeadsPage({
  userRole,
  pageTitle,
  pageDescription,
  testId,
  initialStatus
}: LeadsPageProps) {
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [interactionType, setInteractionType] = useState<"call" | "meeting">("call");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [updatingLeads, setUpdatingLeads] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("table");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [leadToAssign, setLeadToAssign] = useState<Lead | null>(null);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [leadEditDialogOpen, setLeadEditDialogOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
  const [selectedAssignedTo, setSelectedAssignedTo] = useState<string>("All Staff");
  const selectedAssignedToRef = useRef<string>("All Staff");

  // Filter states - use initialStatus if provided, otherwise default to 'new'
  const [selectedStatuses, setSelectedStatuses] = useState<LeadStatus[]>(
    initialStatus 
      ? (Array.isArray(initialStatus) ? initialStatus : [initialStatus])
      : ['new']
  );
  const [showFilters, setShowFilters] = useState(true);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const {
    leads,
    loading,
    error,
    pagination,
    fetchLeads,
    updateLeadStatusOptimistic,
    deleteLead,
  } = useLeadStore();

  const { users: staffMembers, getAllStaff } = useUserStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch leads on component mount and when filters change
  useEffect(() => {
    const fetchData = async () => {
      const queryParams: LeadQueryParams = {
        page: currentPage,
        limit: pageSize,
        status: selectedStatuses,
        search: debouncedSearchTerm || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };

      // Handle assignedTo filter for admin users - use ref to get current value
      const currentAssignedTo = selectedAssignedToRef.current;
      if (userRole === 'admin' && currentAssignedTo && currentAssignedTo !== "All Staff") {
        queryParams.assignedTo = currentAssignedTo;
      }

      console.log('Fetching leads with params:', {
        queryParams,
        selectedStatuses,
        userRole
      });

      await fetchLeads(queryParams);
    };

    fetchData();
  }, [currentPage, pageSize, debouncedSearchTerm, selectedStatuses, selectedAssignedTo, dateFrom, dateTo, fetchLeads, userRole]);

  // Fetch staff members for admin
  useEffect(() => {
    if (userRole === 'admin') {
      getAllStaff();
    }
  }, [userRole, getAllStaff]);

  // Debounced search with minimum 3 characters
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 3 || searchTerm.length === 0) {
        setDebouncedSearchTerm(searchTerm);
        setCurrentPage(1);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleCall = (lead: Lead) => {
    const mobile = getLeadMobile(lead);
    if (!mobile) {
      toast({
        title: "No Phone Number",
        description: "This lead doesn't have a mobile number",
        variant: "destructive",
      });
      return;
    }

    const phoneNumber = mobile.replace(/[^\d]/g, '');
    const dialerUrl = `tel:${phoneNumber}`;
    window.location.href = dialerUrl;
  };

  const handleMeeting = (lead: Lead) => {
    setSelectedLeadId(lead._id);
    setInteractionType("meeting");
    setInteractionDialogOpen(true);
  };

  const handleQuotation = () => {
    navigate('/staff/quotations');
  };

  const handleWhatsApp = (lead: Lead, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const mobile = getLeadMobile(lead);
    if (!mobile) return;
    const digits = mobile.replace(/[^\d]/g, '');
    if (!digits) return;
    const url = `https://wa.me/${digits}`;
    window.open(url, '_blank', 'noopener');
  };

  const handleView = (lead: Lead) => {
    navigate(`/${userRole}/leads/${lead._id}`);
  };

  const handleDelete = (lead: Lead) => {
    setLeadToDelete(lead);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!leadToDelete) return;

    setIsDeleting(true);
    try {
      await deleteLead(leadToDelete._id);
      toast({
        title: "Success",
        description: "Lead deleted successfully",
      });
      // Refresh data
      const queryParams = {
        page: currentPage,
        limit: pageSize,
        status: selectedStatuses,
        search: debouncedSearchTerm || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      };
      await fetchLeads(queryParams);
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast({
        title: "Error",
        description: "Failed to delete lead",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setLeadToDelete(null);
    }
  };

  const handleAssign = (lead: Lead) => {
    setLeadToAssign(lead);
    setAssignDialogOpen(true);
  };

  const handleEdit = (lead: Lead) => {
    setLeadToEdit(lead);
    setLeadEditDialogOpen(true);
  };

  const handleAssignedToChange = (value: string) => {
    setSelectedAssignedTo(value);
    selectedAssignedToRef.current = value;
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const isTransitionAllowed = (fromStatus: LeadStatus, toStatus: LeadStatus): boolean => {
    return ALLOWED_TRANSITIONS[fromStatus]?.includes(toStatus) || false;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l._id === event.active.id);
    setActiveLead(lead || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over || active.id === over.id) {
      return;
    }

    const leadId = active.id as string;
    const newStatus = over.id as LeadStatus;
    const lead = leads.find((l) => l._id === leadId);

    if (!lead) {
      toast({
        title: "Error",
        description: "Lead not found",
        variant: "destructive",
      });
      return;
    }

    if (!isTransitionAllowed(lead.status, newStatus)) {
      toast({
        title: "Invalid Move",
        description: `Cannot move lead from ${lead.status.replace('_', ' ')} to ${newStatus.replace('_', ' ')}`,
        variant: "destructive",
      });
      return;
    }

    setUpdatingLeads(prev => new Set(prev).add(leadId));

    try {
      const { success, error: optError } = await updateLeadStatusOptimistic(leadId, newStatus);

      if (success) {
        toast({
          title: "Success",
          description: `Lead status updated to ${newStatus.replace('_', ' ')}`,
        });
      } else {
        let message = optError;
        if (!message) {
          try {
            await updateLeadApi(leadId, { status: newStatus });
          } catch (e) {
            message = e instanceof Error ? e.message : 'Failed to update lead status';
          }
        }
        toast({
          title: "Invalid Move",
          description: message || 'Failed to update lead status',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast({
        title: "Error",
        description: "Failed to update lead status",
        variant: "destructive",
      });
    } finally {
      setUpdatingLeads(prev => {
        const newSet = new Set(prev);
        newSet.delete(leadId);
        return newSet;
      });
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Lead',
      render: (_value: string, lead: Lead) => (
        <div>
          <div className="text-sm font-medium text-foreground">{getLeadName(lead)}</div>
          <div className="text-sm text-muted-foreground">{getLeadEmail(lead) || 'No email'}</div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'location',
      header: 'Location',
      render: (_value: string, lead: Lead) => getLeadLocation(lead) || 'No location',
      sortable: true,
    },
    {
      key: 'mobile',
      header: 'Contact',
      render: (_value: string, lead: Lead) => getLeadMobile(lead) || 'No phone',
    },
    ...(userRole === 'admin' ? [{
      key: 'assignedTo',
      header: 'Assigned To',
      render: (_value: string, lead: Lead) => (
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">
            {lead.assignedTo?.name || 'Unassigned'}
          </span>
        </div>
      ),
    }] : []),
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => (
        <StatusBadge status={value as LeadStatus} type="lead" />
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (value: string) => {
        const date = new Date(value);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        return `${diffDays - 1} days ago`;
      },
    },
    {
      key: 'source',
      header: 'Source',
      render: (value: string) => value || 'Unknown',
    },
  ];

  const actions = (lead: Lead) => (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCall(lead)}
              className="text-purple-600 hover:text-purple-700"
              data-testid={`call-lead-${lead._id}`}
            >
              <Phone className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Call</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMeeting(lead)}
              className="text-blue-600 hover:text-blue-700"
              data-testid={`meeting-lead-${lead._id}`}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Call & Meeting</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuotation()}
              className="text-green-600 hover:text-green-700"
              data-testid={`quote-lead-${lead._id}`}
            >
              <FileText className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Quotation</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>


      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleWhatsApp(lead)}
              className="text-emerald-600 hover:text-emerald-700"
              data-testid={`whatsapp-lead-${lead._id}`}
            >
              <FaWhatsapp className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>WhatsApp</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" data-testid={`lead-menu-${lead._id}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleView(lead)}>
            View Details
          </DropdownMenuItem>
          {(userRole === 'admin' || userRole === 'staff') && (
            <DropdownMenuItem onClick={() => handleEdit(lead)}>
              Edit Lead
            </DropdownMenuItem>
          )}
          {userRole === 'admin' && (
            <>
              {/* if lead is not assigned to any staff, then show the assign to staff option */}
              {lead?.assignedTo == undefined && (
                <DropdownMenuItem onClick={() => handleAssign(lead)}>
                  Assign to Staff
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDelete(lead)}
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
  );

  // Kanban columns for lead statuses
  const kanbanColumns = [
    { id: 'new', title: 'New', status: 'new' as const },
    { id: 'follow_up', title: 'Follow Up', status: 'follow_up' as const },
    { id: 'not_interested', title: 'Not Interested', status: 'not_interested' as const },
    { id: 'quotation_sent', title: 'Quotation Sent', status: 'quotation_sent' as const },
    { id: 'converted', title: 'Converted', status: 'converted' as const },
    { id: 'lost', title: 'Lost', status: 'lost' as const },
  ];

  const KanbanBoard = ({
    leads,
    sensors,
    handleDragStart,
    handleDragEnd,
    handleCall,
    handleMeeting,
    handleQuotation,
    handleWhatsApp,
    handleView,
    handleDelete,
    handleAssign,
    updatingLeads,
    userRole,
    activeLead
  }: {
    leads: Lead[];
    sensors: ReturnType<typeof useSensors>;
    handleDragStart: (event: DragStartEvent) => void;
    handleDragEnd: (event: DragEndEvent) => void;
    handleCall: (lead: Lead) => void;
    handleMeeting: (lead: Lead) => void;
    handleQuotation: (lead: Lead) => void;
    handleWhatsApp: (lead: Lead, e?: React.MouseEvent) => void;
    handleView: (lead: Lead) => void;
    handleDelete?: (lead: Lead) => void;
    handleAssign?: (lead: Lead) => void;
    updatingLeads: Set<string>;
    userRole: 'admin' | 'staff';
    activeLead: Lead | null;
  }) => {
    return (
      <div className="w-full">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 h-full min-h-[400px] w-full">
            {kanbanColumns.map((column) => {
              const columnLeads = leads?.filter(lead => lead.status === column.status) || [];

              return (
                <DroppableColumn
                  key={column.id}
                  title={column.title}
                  status={column.status}
                  leads={columnLeads}
                  onCall={handleCall}
                  onMeeting={handleMeeting}
                  onQuotation={handleQuotation}
                  onWhatsApp={handleWhatsApp}
                  onView={handleView}
                  onDelete={userRole === 'admin' ? handleDelete : undefined}
                  onAssign={userRole === 'admin' ? handleAssign : undefined}
                  updatingLeads={updatingLeads}
                  userRole={userRole}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeLead ? (
              <Card className="opacity-95 shadow-2xl border-2 border-blue-300 bg-white transform rotate-3 scale-105">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <h5 className="font-semibold text-foreground text-sm">{getLeadName(activeLead)}</h5>
                    <p className="text-xs text-muted-foreground">
                      {getLeadLocation(activeLead) || 'No location'}
                    </p>
                    {getLeadMobile(activeLead) && (
                      <p className="text-xs text-muted-foreground font-mono bg-gray-50 px-2 py-1 rounded">
                        {getLeadMobile(activeLead)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    );
  };


  // All available status options
  const allStatuses: { value: LeadStatus; label: string }[] = [
    { value: 'new', label: 'New' },
    { value: 'follow_up', label: 'Follow Up' },
    { value: 'not_interested', label: 'Not Interested' },
    { value: 'quotation_sent', label: 'Quotation Sent' },
    { value: 'converted', label: 'Converted' },
    { value: 'lost', label: 'Lost' },
  ];

  const handleStatusToggle = (status: LeadStatus) => {
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

      const queryParams: LeadQueryParams = {
        page: 1,
        limit: pageSize,
        status: newStatuses,
        search: debouncedSearchTerm || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };

      // Only add assignedTo filter for admin users when a specific staff is selected (not "All Staff")
      if (userRole === 'admin' && selectedAssignedTo && selectedAssignedTo !== "All Staff") {
        queryParams.assignedTo = selectedAssignedTo;
      }

      fetchLeads(queryParams);
      setCurrentPage(1);

      return newStatuses;
    });
  };

  const clearAllFilters = () => {
    const defaultStatuses: LeadStatus[] = ['new'];
    setSelectedStatuses(defaultStatuses);
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setSelectedAssignedTo("All Staff");
    selectedAssignedToRef.current = "All Staff";
    const queryParams: LeadQueryParams = {
      page: 1,
      limit: pageSize,
      status: defaultStatuses,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };

    // Handle assignedTo filter for admin users - use ref to get current value
    const currentAssignedTo = selectedAssignedToRef.current;
    if (userRole === 'admin' && currentAssignedTo && currentAssignedTo !== "All Staff") {
      queryParams.assignedTo = currentAssignedTo;
    }

    fetchLeads(queryParams);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);

    const queryParams: LeadQueryParams = {
      page: 1,
      limit: pageSize,
      status: selectedStatuses,
      search: debouncedSearchTerm || undefined,
      dateFrom: from || undefined,
      dateTo: to || undefined,
    };

    // Handle assignedTo filter for admin users - use ref to get current value
    const currentAssignedTo = selectedAssignedToRef.current;
    if (userRole === 'admin' && currentAssignedTo && currentAssignedTo !== "All Staff") {
      queryParams.assignedTo = currentAssignedTo;
    }

    fetchLeads(queryParams);
    setCurrentPage(1);
  };

  const clearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
    const queryParams: LeadQueryParams = {
      page: 1,
      limit: pageSize,
      status: selectedStatuses,
      search: debouncedSearchTerm || undefined,
    };

    // Handle assignedTo filter for admin users - use ref to get current value
    const currentAssignedTo = selectedAssignedToRef.current;
    if (userRole === 'admin' && currentAssignedTo && currentAssignedTo !== "All Staff") {
      queryParams.assignedTo = currentAssignedTo;
    }

    fetchLeads(queryParams);
    setCurrentPage(1);
  };

  const FilterBar = ({
    selectedStatuses,
    dateFrom,
    dateTo,
    showFilters,
    setShowFilters,
    handleStatusToggle,
    clearAllFilters,
    clearDateFilter,
    handleDateRangeChange,
    userRole,
    staffMembers,
    selectedAssignedTo,
    handleAssignedToChange
  }: {
    selectedStatuses: LeadStatus[];
    dateFrom: string;
    dateTo: string;
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    handleStatusToggle: (status: LeadStatus) => void;
    clearAllFilters: () => void;
    clearDateFilter: () => void;
    handleDateRangeChange: (from: string, to: string) => void;
    userRole: 'admin' | 'staff';
    staffMembers: User[];
    selectedAssignedTo: string;
    handleAssignedToChange: (value: string) => void;
  }) => (
    <div className="bg-card border border-border rounded-lg p-2 sm:p-3 pb-1 shadow-sm mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Filters</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs font-medium">
              {selectedStatuses.length} status{selectedStatuses.length !== 1 ? 'es' : ''}
            </Badge>
            {(dateFrom || dateTo) && (
              <Badge variant="outline" className="text-xs font-medium">
                Date range
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearAllFilters();
              clearDateFilter();
            }}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear All
          </Button>
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
        <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-6">
          {/* Status Filters - Mobile Responsive */}
          <div className="flex-1 w-full">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Lead Status
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:flex xl:flex-wrap gap-2 lg:gap-3">
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

          {/* Assigned To Filter - Only for Admin */}
          {userRole === 'admin' && staffMembers.length > 0 && (
            <div className="w-full lg:w-auto lg:flex-shrink-0">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Assigned To
              </div>
              <Select value={selectedAssignedTo || "All Staff"} onValueChange={handleAssignedToChange}>
                <SelectTrigger className="h-8 text-xs font-normal w-full lg:w-48">
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Staff">All staff</SelectItem>
                  <SelectItem value="Unassigned">Unassigned</SelectItem>
                  {staffMembers.map((staff) => (
                    <SelectItem key={staff._id} value={staff._id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date Range Filters - Mobile Responsive */}
          <div className="w-full lg:w-auto lg:flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                Date Range
              </div>
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDateFilter}
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
                      onSelect={(date) => handleDateRangeChange(date ? formatDateToLocal(date) : '', dateTo)}
                      disabled={(date) =>
                        date > new Date() || (dateTo ? date > new Date(dateTo) : false)
                      }
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
                      onSelect={(date) => handleDateRangeChange(dateFrom, date ? formatDateToLocal(date) : '')}
                      disabled={(date) =>
                        date > new Date() || (dateFrom ? date < new Date(dateFrom) : false)
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6" data-testid={testId}>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground">Error Loading Leads</h2>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button onClick={() => fetchLeads()} className="mt-4">
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
          
          {/* Search and Add Lead - Mobile Stack */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 h-9 sm:h-10"
              />
              {searchTerm && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {(userRole === 'admin' || userRole === 'staff') && (
              <Button onClick={() => setLeadDialogOpen(true)} className="h-9 sm:h-10 w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Add Lead</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}
          </div>
        </div>

        <FilterBar
          selectedStatuses={selectedStatuses}
          dateFrom={dateFrom}
          dateTo={dateTo}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          handleStatusToggle={handleStatusToggle}
          clearAllFilters={clearAllFilters}
          clearDateFilter={clearDateFilter}
          handleDateRangeChange={handleDateRangeChange}
          userRole={userRole}
          staffMembers={staffMembers || []}
          selectedAssignedTo={selectedAssignedTo}
          handleAssignedToChange={handleAssignedToChange}
        />

        <Card>
          <CardContent className="p-1 sm:p-2 lg:p-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                  <TabsTrigger value="table" className="text-xs sm:text-sm">Table View</TabsTrigger>
                  <TabsTrigger value="kanban" className="text-xs sm:text-sm">Kanban View</TabsTrigger>
                </TabsList>

                {activeTab === "table" && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">Rows per page:</span>
                    <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(Number(value))}>
                      <SelectTrigger className="w-full sm:w-auto min-w-[80px] h-8 px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="w-fit min-w-[46px]">
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <TabsContent value="table">
                <DataTable
                  data={leads}
                  columns={columns}
                  onRowClick={handleView}
                  actions={actions}
                  isLoading={loading}
                  emptyMessage="No leads found."
                  serverSide={true}
                  currentPage={pagination?.currentPage || 1}
                  totalPages={pagination?.totalPages || 1}
                  pageSize={pagination?.itemsPerPage || 10}
                  totalItems={pagination?.totalItems || 0}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  showPageSizeSelector={false}
                />
              </TabsContent>

              <TabsContent value="kanban">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground">Loading...</div>
                  </div>
                ) : (
                  <KanbanBoard
                    leads={leads || []}
                    sensors={sensors}
                    handleDragStart={handleDragStart}
                    handleDragEnd={handleDragEnd}
                    handleCall={handleCall}
                    handleMeeting={handleMeeting}
                    handleQuotation={handleQuotation}
                    handleWhatsApp={handleWhatsApp}
                    handleView={handleView}
                    handleDelete={userRole === 'admin' ? handleDelete : undefined}
                    handleAssign={userRole === 'admin' ? handleAssign : undefined}
                    updatingLeads={updatingLeads}
                    userRole={userRole}
                    activeLead={activeLead}
                  />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <InteractionDialog
          open={interactionDialogOpen}
          onOpenChange={setInteractionDialogOpen}
          defaultLeadId={selectedLeadId}
          defaultType={interactionType}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          title="Delete Lead"
          description="Are you sure you want to delete this lead? This action cannot be undone."
          itemName={leadToDelete ? getLeadName(leadToDelete) : ""}
          itemType="lead"
          isLoading={isDeleting}
        />

        {/* Assign Lead Dialog - Only for admin */}
        {userRole === 'admin' && (
          <AssignLeadDialog
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            lead={leadToAssign}
            staffMembers={staffMembers || []}
            onSuccess={() => {
              // Refresh data after successful assignment
              const queryParams: LeadQueryParams = {
                page: currentPage,
                limit: pageSize,
                status: selectedStatuses,
                search: debouncedSearchTerm || undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
              };

              // Only add assignedTo filter for admin users when a specific staff is selected (not "All Staff")
              if (userRole === 'admin' && selectedAssignedTo && selectedAssignedTo !== "All Staff") {
                queryParams.assignedTo = selectedAssignedTo;
              }

              fetchLeads(queryParams);
            }}
          />
        )}

        {/* Add Lead Dialog - For admin and staff */}
        {(userRole === 'admin' || userRole === 'staff') && (
          <LeadDialog
            open={leadDialogOpen}
            onOpenChange={setLeadDialogOpen}
            mode="create"
          />
        )}

        {/* Edit Lead Dialog - For admin and staff */}
        {(userRole === 'admin' || userRole === 'staff') && (
          <LeadEditDialog
            open={leadEditDialogOpen}
            onOpenChange={(open) => {
              setLeadEditDialogOpen(open);
              if (!open) {
                // Refresh leads list after closing dialog (in case it was updated)
                if (leadToEdit) {
                  const queryParams: LeadQueryParams = {
                    page: currentPage,
                    limit: pageSize,
                    status: selectedStatuses,
                    search: debouncedSearchTerm || undefined,
                    dateFrom: dateFrom || undefined,
                    dateTo: dateTo || undefined,
                  };

                  // Handle assignedTo filter for admin users - use ref to get current value
                  const currentAssignedTo = selectedAssignedToRef.current;
                  if (userRole === 'admin' && currentAssignedTo && currentAssignedTo !== "All Staff") {
                    queryParams.assignedTo = currentAssignedTo;
                  }

                  fetchLeads(queryParams);
                }
                setLeadToEdit(null);
              }
            }}
            lead={leadToEdit}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
