import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Plus, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEventConfigStore } from "@/store/eventConfigStore";
import { EventConfigDialog } from "@/components/dialogs/event-config-dialog";
import { DeleteConfirmationDialog } from "@/components/dialogs/delete-confirmation-dialog";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { EventConfig } from "@/api/eventConfigApi";

export default function AdminEventConfig() {
  const {
    events,
    loading,
    error,
    fetchAllEvents,
    deleteEvent,
    clearError,
  } = useEventConfigStore();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventConfig | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    fetchAllEvents();
  }, [fetchAllEvents]);

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
    setSelectedEvent(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleEdit = (event: EventConfig) => {
    setSelectedEvent(event);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleDelete = (event: EventConfig) => {
    setSelectedEvent(event);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedEvent) return;

    const success = await deleteEvent(selectedEvent._id);
    if (success) {
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
      setDeleteDialogOpen(false);
      setSelectedEvent(null);
    } else {
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Event Name',
      render: (value: string) => (
        <div className="font-medium text-foreground">{value}</div>
      ),
      sortable: true,
    },
    {
      key: 'description',
      header: 'Description',
      render: (value: string) => (
        <div className="text-sm text-muted-foreground line-clamp-2">{value}</div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (value: string) => {
        const date = new Date(value);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      },
      sortable: true,
    },
  ];

  const actions = (event: EventConfig) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleEdit(event)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleDelete(event)}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Event Configuration</h1>
            <p className="text-muted-foreground mt-2">
              Manage event types that can be used when creating leads
            </p>
          </div>
          <Button onClick={handleCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Event
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={events}
              columns={columns}
              actions={actions}
              isLoading={loading}
              emptyMessage="No events found. Create your first event to get started."
            />
          </CardContent>
        </Card>

        <EventConfigDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedEvent(null);
            }
          }}
          event={selectedEvent}
          mode={dialogMode}
        />

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDelete}
          title="Delete Event"
          description="Are you sure you want to delete this event? This action cannot be undone."
          itemName={selectedEvent?.name || ""}
          itemType="event"
          isLoading={loading}
        />
      </div>
    </DashboardLayout>
  );
}

