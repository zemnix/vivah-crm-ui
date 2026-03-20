import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Plus, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSourceStore } from "@/store/sourceStore";
import { SourceDialog } from "@/components/dialogs/source-dialog";
import { DeleteConfirmationDialog } from "@/components/dialogs/delete-confirmation-dialog";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Source } from "@/api/sourceApi";

export default function AdminSourceConfig() {
  const {
    sources,
    loading,
    error,
    fetchSources,
    deleteSource,
    clearError,
  } = useSourceStore();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

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
    setSelectedSource(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleEdit = (source: Source) => {
    setSelectedSource(source);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleDelete = (source: Source) => {
    setSelectedSource(source);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedSource) return;

    const success = await deleteSource(selectedSource._id);
    if (success) {
      toast({
        title: "Success",
        description: "Source deleted successfully",
      });
      setDeleteDialogOpen(false);
      setSelectedSource(null);
    } else {
      toast({
        title: "Error",
        description: "Failed to delete source",
        variant: "destructive",
      });
    }
  };

  const filteredSources = useMemo(() => sources, [sources]);

  const columns = [
    {
      key: 'name',
      header: 'Source Name',
      render: (value: string) => (
        <div className="font-medium text-foreground">{value}</div>
      ),
      sortable: true,
    },
    {
      key: 'description',
      header: 'Description',
      render: (value: string) => (
        <div className="text-muted-foreground text-sm">{value || '—'}</div>
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

  const actions = (source: Source) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleEdit(source)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleDelete(source)}
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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Source Configuration</h1>
            <p className="text-muted-foreground mt-2">
              Manage lead sources used in lead creation and updates
            </p>
          </div>
          <Button onClick={handleCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Source
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={filteredSources}
              columns={columns}
              actions={actions}
              isLoading={loading}
              emptyMessage="No sources found. Create your first source to get started."
            />
          </CardContent>
        </Card>

        <SourceDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedSource(null);
            }
          }}
          source={selectedSource}
          mode={dialogMode}
        />

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDelete}
          title="Delete Source"
          description="Are you sure you want to delete this source? This action cannot be undone."
          itemName={selectedSource?.name || ""}
          itemType="source"
          isLoading={loading}
        />
      </div>
    </DashboardLayout>
  );
}
