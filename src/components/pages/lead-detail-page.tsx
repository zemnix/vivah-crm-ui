import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Timeline } from "@/components/ui/timeline";
import { InteractionDialog } from "@/components/dialogs/interaction-dialog";
import { useLeadStore } from "@/store/leadStore";
import { useUserStore } from "@/store/admin/userStore";
import { useBaraatConfigStore } from "@/store/baraatConfigStore";
import { getLeadActivitiesApi, getActivityTypeLabel } from "@/api/activityApi";
import { updateLeadApi, getLeadName, getLeadEmail, getLeadMobile, getLeadLocation } from "@/api/leadApi";
import type { Activity } from "@/api/activityApi";
import { ArrowLeft, Plus, FileText, Mail, Building2, Phone, Trash2, MoreHorizontal, Calendar } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LeadStatus } from "@/api/leadApi";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "@/components/dialogs/delete-confirmation-dialog";
import { AssignLeadDialog } from "@/components/dialogs/assign-lead-dialog";
import { LeadEditDialog } from "@/components/dialogs/lead-edit-dialog";
import { ClientProgressionTable } from "@/components/client-progression-table";

interface LeadDetailPageProps {
  readonly userRole: 'admin' | 'staff';
  readonly backPath: string;
  readonly testId: string;
}

export default function LeadDetailPage({
  userRole,
  backPath,
  testId
}: LeadDetailPageProps) {
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const {
    selectedLead: lead,
    loading: isLoading,
    fetchLeadById,
    updateLeadStatusOptimistic,
    deleteLead,
    clearError
  } = useLeadStore();

  const { users, fetchAllUsers } = useUserStore();
  const { activeFields, fetchActiveFields } = useBaraatConfigStore();

  useEffect(() => {
    const loadLead = async () => {
      if (id) {
        setLocalError(null);
        const result = await fetchLeadById(id);
        if (!result) {
          setLocalError("Lead not found or you don't have access to it");
        }
      }
    };

    loadLead();

    return () => {
      clearError();
    };
  }, [id, fetchLeadById, clearError]);

  // Fetch staff members for admin
  useEffect(() => {
    if (userRole === 'admin') {
      fetchAllUsers();
    }
  }, [userRole, fetchAllUsers]);

  // Fetch active baraat field configs to display custom fields
  useEffect(() => {
    fetchActiveFields();
  }, [fetchActiveFields]);


  // Function to fetch activities
  const fetchActivities = async () => {
    if (lead?._id) {
      setActivitiesLoading(true);
      try {
        const activityData = await getLeadActivitiesApi(lead._id);
        setActivities(activityData || []);
      } catch (error) {
        console.error('Failed to fetch activities:', error);
        setActivities([]);
      } finally {
        setActivitiesLoading(false);
      }
    }
  };

  // Fetch activities when lead is loaded
  useEffect(() => {
    fetchActivities();
  }, [lead?._id]);

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!lead) return;

    const { success, error: optError } = await updateLeadStatusOptimistic(lead._id, newStatus);

    if (success) {
      toast({
        title: "Success",
        description: `Lead status updated to ${newStatus.replace('_', ' ')}`,
      });
      // Refresh activities after status change
      await fetchActivities();
    } else {
      let message = optError;
      if (!message) {
        try {
          await updateLeadApi(lead._id, { status: newStatus });
          // Refresh activities after status change
          await fetchActivities();
        } catch (e) {
          message = e instanceof Error ? e.message : 'Failed to update lead status';
        }
      }
      toast({
        title: "Invalid Status Change",
        description: message || 'Failed to update lead status',
        variant: "destructive",
      });
    }
  };

  const handleScheduleInteraction = () => {
    setInteractionDialogOpen(true);
  };

  const handleCreateQuotation = () => {
    navigate(`/${userRole}/quotations/new?leadId=${lead?._id}`);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!lead) return;

    setIsDeleting(true);
    try {
      await deleteLead(lead._id);
      toast({
        title: "Success",
        description: "Lead deleted successfully",
      });
      navigate(backPath);
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
    }
  };

  const handleAssign = () => {
    setAssignDialogOpen(true);
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
  };


  // Map activity types to timeline types
  const mapActivityToTimelineType = (activity: Activity): 'call' | 'meeting' | 'note' | 'status' | 'quotation' => {
    switch (activity.type) {
      case 'interaction':
        // Check meta.interactionType to determine if it's a call or meeting
        if (activity.meta?.interactionType === 'meeting') {
          return 'meeting';
        }
        return 'call';
      case 'quotation':
        return 'quotation';
      case 'status_change':
        return 'status';
      case 'service_request':
        return 'meeting';
      default:
        return 'note';
    }
  };

  // Create timeline items from activities
  const timelineItems = [
    ...activities.map(activity => {
      // Build a better description based on activity type and meta
      let description = activity.description || '';
      if (activity.type === 'interaction' && activity.meta) {
        const interactionType = activity.meta.interactionType || 'interaction';
        const interactionStatus = activity.meta.interactionStatus || '';
        const date = activity.meta.date ? new Date(activity.meta.date).toLocaleString() : '';
        description = `${interactionType === 'call' ? 'Call' : 'Meeting'} ${interactionStatus}${date ? ` on ${date}` : ''}`;
        if (activity.meta.remarks) {
          description += ` - ${activity.meta.remarks}`;
        }
      } else if (activity.type === 'status_change' && activity.meta) {
        const oldStatus = activity.meta.oldStatus;
        const newStatus = activity.meta.newStatus;
        if (oldStatus && newStatus) {
          description = `Status changed from ${oldStatus.replace('_', ' ')} to ${newStatus.replace('_', ' ')}`;
        } else if (newStatus) {
          description = `Status set to ${newStatus.replace('_', ' ')}`;
        }
      }

      return {
        id: activity._id,
        title: getActivityTypeLabel(activity.type),
        description: description || `${getActivityTypeLabel(activity.type)} activity`,
        timestamp: new Date(activity.createdAt),
        type: mapActivityToTimelineType(activity),
        user: activity.userId?.name
      };
    }),
    // Lead assignment item
    {
      id: 'assigned',
      title: 'Lead Assigned',
      description: 'Lead was assigned to you',
      timestamp: lead ? new Date(lead.createdAt) : new Date(),
      type: 'note' as const,
      user: lead?.createdBy?.name || 'System'
    }
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Prepare SFX details for display
  const sfxDetailsItems = useMemo(() => {
    if (!lead?.sfx) {
      return [];
    }

    // Helper to safely convert quantity to string
    const convertQuantityToString = (quantity: any): string => {
      if (quantity === null || quantity === undefined) {
        return '';
      }
      
      // If it's already a string or number, convert directly
      if (typeof quantity === 'string') {
        return quantity.trim();
      }
      if (typeof quantity === 'number') {
        return String(quantity);
      }
      
      // If it's an object, try to extract meaningful value
      if (typeof quantity === 'object') {
        // Check if it has a value property (Mongoose Map might wrap it)
        if ('value' in quantity) {
          const value = quantity.value;
          if (typeof value === 'string' || typeof value === 'number') {
            return String(value);
          }
        }
        // Check for common object properties that might contain the actual value
        if ('quantity' in quantity && (typeof quantity.quantity === 'string' || typeof quantity.quantity === 'number')) {
          return String(quantity.quantity);
        }
        // If it's an array with one element, use that
        if (Array.isArray(quantity) && quantity.length > 0) {
          return convertQuantityToString(quantity[0]);
        }
        // Last resort: return empty string for complex objects
        return '';
      }
      
      return String(quantity);
    };

    // Convert SFX from Map/object to array format
    let sfxEntries: Array<{ name: string; quantity: string }> = [];
    
    if (Array.isArray(lead.sfx)) {
      // If it's already an array (legacy format), use it directly
      sfxEntries = lead.sfx.map(s => ({
        name: s.name || '',
        quantity: convertQuantityToString(s.quantity)
      }));
    } else if (typeof lead.sfx === 'object' && lead.sfx !== null) {
      // If it's an object/Map, convert it to array
      // Handle both regular objects and Mongoose Map-like structures
      let entries: Array<[string, any]> = [];
      
      // Check if it's a Map instance (in browser environment)
      // Use type assertion since lead.sfx can be array or object at runtime
      const sfxValue = lead.sfx as any;
      if (sfxValue instanceof Map) {
        entries = Array.from(sfxValue.entries()) as Array<[string, any]>;
      } else {
        // It's a plain object
        entries = Object.entries(sfxValue) as Array<[string, any]>;
      }
      
      sfxEntries = entries
        .filter((entry): entry is [string, any] => {
          const [name] = entry;
          return Boolean(name && name !== 'null' && name !== 'undefined' && name !== '__v');
        })
        .map(([name, quantity]) => ({
          name: String(name),
          quantity: convertQuantityToString(quantity)
        }));
    }

    return sfxEntries.filter(item => item.name && item.quantity);
  }, [lead?.sfx]);

  // Prepare baraat details for display
  const baraatDetailsItems = useMemo(() => {
    if (!lead?.baraatDetails || Object.keys(lead.baraatDetails).length === 0) {
      return [];
    }

    // Create a map of field names to field configs for quick lookup
    const fieldMap = new Map(activeFields.map(field => [field.name, field]));
    
    // Get all keys from baraatDetails and sort by field name
    const detailKeys = Object.keys(lead.baraatDetails);
    const sortedKeys = detailKeys.sort((a, b) => {
      const fieldA = fieldMap.get(a);
      const fieldB = fieldMap.get(b);
      // Sort by field name if both exist in config, otherwise by key name
      if (fieldA && fieldB) {
        return fieldA.name.localeCompare(fieldB.name);
      }
      return a.localeCompare(b);
    });

    return sortedKeys.map((key) => {
      const value = lead.baraatDetails?.[key];
      const field = fieldMap.get(key);
      const label = field?.name || key;
      const displayValue = value !== null && value !== undefined && value !== '' 
        ? String(value) 
        : 'Not provided';

      return { key, label, displayValue };
    });
  }, [lead?.baraatDetails, activeFields]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div>
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (localError) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground">Lead Not Found</h2>
            <p className="text-muted-foreground mt-2">{localError}</p>
            <Button onClick={() => navigate(backPath)} className="mt-4">
              Back to Leads
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground">Lead Not Found</h2>
            <p className="text-muted-foreground mt-2">The lead you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={() => navigate(backPath)} className="mt-4">
              Back to Leads
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(backPath)}
              data-testid="back-button"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{getLeadName(lead)}</h1>
              <p className="text-muted-foreground">{getLeadLocation(lead) || 'No location provided'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {
              userRole !== 'admin' && (
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={handleCreateQuotation}
                    data-testid="new-quotation-button"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    New Quotation
                  </Button>
                  <Button
                    onClick={handleScheduleInteraction}
                    data-testid="schedule-interaction-button"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Schedule Call & Meeting
                  </Button>
                </div>)
            }

            {/* Admin Actions */}
            {userRole === 'admin' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEdit}>
                    Edit Lead
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAssign}>
                    Assign to Staff
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleScheduleInteraction}>
                    <Plus className="mr-2 h-4 w-4" />
                    Schedule Call & Meeting
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Staff Actions - Edit button */}
            {userRole === 'staff' && (
              <Button
                variant="outline"
                onClick={handleEdit}
                data-testid="edit-lead-button"
              >
                Edit Lead
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lead Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Lead Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Email</p>
                      <p className="text-sm text-muted-foreground">{getLeadEmail(lead) || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Mobile</p>
                      <p className="text-sm text-muted-foreground">{getLeadMobile(lead) || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Address</p>
                      <p className="text-sm text-muted-foreground">{lead.customer?.address || 'Not provided'}</p>
                    </div>
                  </div>
                  {lead.customer?.whatsappNumber && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">WhatsApp</p>
                        <p className="text-sm text-muted-foreground">{lead.customer.whatsappNumber}</p>
                      </div>
                    </div>
                  )}
                </div>

                {lead.customer?.dateOfBirth && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Date of Birth</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(lead.customer.dateOfBirth).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                {lead.customer?.venueEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Venue Email</p>
                      <p className="text-sm text-muted-foreground">{lead.customer.venueEmail}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Status</p>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={lead.status} type="lead" />
                    <Select value={lead.status} onValueChange={handleStatusChange}>
                      <SelectTrigger className="w-48" data-testid="status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                        <SelectItem value="not_interested">Not Interested</SelectItem>
                        <SelectItem value="quotation_sent">Quotation Sent</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Created By</p>
                  <p className="text-sm text-muted-foreground">
                    {lead.createdBy ? `${lead.createdBy.name} (${lead.createdBy.role})` : 'System'}
                  </p>
                </div>

                {/* Assigned To - Only for admin */}
                {userRole === 'admin' && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Assigned To</p>
                    <p className="text-sm text-muted-foreground">
                      {lead.assignedTo ? `${lead.assignedTo.name} (${lead.assignedTo.role})` : 'Unassigned'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Events Information */}
            {lead.typesOfEvent && lead.typesOfEvent.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {lead.typesOfEvent.map((event, index) => (
                      <div
                        key={index}
                        className="p-4 border rounded-lg bg-muted/30 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-foreground">{event.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {event.numberOfGuests} {event.numberOfGuests === 1 ? 'guest' : 'guests'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Event Date</p>
                              <p className="text-foreground font-medium">
                                {event.date
                                  ? new Date(event.date).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })
                                  : 'Not set'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 flex items-center justify-center">
                              <span className="text-muted-foreground">🌙</span>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Day/Night</p>
                              <p className="text-foreground font-medium capitalize">
                                {event.dayNight || 'both'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SFX Information */}
            {sfxDetailsItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>SFX Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sfxDetailsItems.map((sfxItem, index) => (
                      <div
                        key={index}
                        className="p-4 border rounded-lg bg-muted/30 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-foreground">{sfxItem.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {sfxItem.quantity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Baraat Details (Custom Fields) */}
            {baraatDetailsItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Baraat Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {baraatDetailsItems.map(({ key, label, displayValue }) => (
                      <div key={key} className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-sm text-muted-foreground">{displayValue}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Client Progression - Only for converted leads */}
            {lead?.status === 'converted' && (
              <ClientProgressionTable lead={lead} />
            )}
          </div>

          {/* Activity Timeline */}
          <div>
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div
                  className="max-h-[60vh] overflow-y-auto px-6 pb-6 scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#d1d5db #f3f4f6'
                  }}
                >
                  {activitiesLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    <Timeline items={timelineItems} />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <InteractionDialog
          open={interactionDialogOpen}
          onOpenChange={(open) => {
            setInteractionDialogOpen(open);
            // Refresh activities when dialog closes (after interaction is created)
            if (!open) {
              fetchActivities();
            }
          }}
          defaultLeadId={lead._id}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          title="Delete Lead"
          description="Are you sure you want to delete this lead? This action cannot be undone."
          itemName={lead ? getLeadName(lead) : ""}
          itemType="lead"
          isLoading={isDeleting}
        />

        {/* Assign Lead Dialog - Only for admin */}
        {userRole === 'admin' && (
          <AssignLeadDialog
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            lead={lead}
            staffMembers={users || []}
            onSuccess={() => {
              // Refresh lead data after successful assignment
              if (lead?._id) {
                fetchLeadById(lead._id);
              }
            }}
          />
        )}

        {/* Edit Lead Dialog - For admin and staff */}
        {(userRole === 'admin' || userRole === 'staff') && (
          <LeadEditDialog
            open={editDialogOpen}
            onOpenChange={(open) => {
              setEditDialogOpen(open);
              // Refresh lead data after closing dialog (in case it was updated)
              if (!open && lead?._id) {
                fetchLeadById(lead._id);
              }
            }}
            lead={lead}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
