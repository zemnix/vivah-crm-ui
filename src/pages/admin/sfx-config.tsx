import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Plus, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSfxConfigStore } from "@/store/sfxConfigStore";
import { SfxConfigDialog } from "@/components/dialogs/sfx-config-dialog";
import { DeleteConfirmationDialog } from "@/components/dialogs/delete-confirmation-dialog";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { SfxConfig } from "@/api/sfxConfigApi";

export default function AdminSfxConfig() {
  const {
    sfxConfigs,
    loading,
    error,
    fetchAllSfxConfigs,
    deleteSfx,
    clearError,
  } = useSfxConfigStore();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSfx, setSelectedSfx] = useState<SfxConfig | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    fetchAllSfxConfigs();
  }, [fetchAllSfxConfigs]);

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
    setSelectedSfx(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleEdit = (sfx: SfxConfig) => {
    setSelectedSfx(sfx);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleDelete = (sfx: SfxConfig) => {
    setSelectedSfx(sfx);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedSfx) return;

    const success = await deleteSfx(selectedSfx._id, false);
    if (success) {
      toast({
        title: "Success",
        description: "SFX config deleted successfully",
      });
      setDeleteDialogOpen(false);
      setSelectedSfx(null);
    } else {
      toast({
        title: "Error",
        description: "Failed to delete SFX config",
        variant: "destructive",
      });
    }
  };

  // With simplified SFX config (name only), just use all configs
  const filteredSfxConfigs = useMemo(() => sfxConfigs, [sfxConfigs]);

  const columns = [
    {
      key: 'name',
      header: 'SFX Name',
      render: (value: string) => (
        <div className="font-medium text-foreground">{value}</div>
      ),
      sortable: true,
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

  const actions = (sfx: SfxConfig) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleEdit(sfx)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleDelete(sfx)}
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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">SFX Configuration</h1>
            <p className="text-muted-foreground mt-2">
              Manage special effects (SFX) configurations
            </p>
          </div>
          <Button onClick={handleCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add SFX
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>SFX Configs</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={filteredSfxConfigs}
              columns={columns}
              actions={actions}
              isLoading={loading}
              emptyMessage="No SFX configs found. Create your first SFX config to get started."
            />
          </CardContent>
        </Card>

        <SfxConfigDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedSfx(null);
            }
          }}
          sfx={selectedSfx}
          mode={dialogMode}
        />

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDelete}
          title="Delete SFX Config"
          description="Are you sure you want to delete this SFX config? This action cannot be undone."
          itemName={selectedSfx?.name || ""}
          itemType="SFX config"
          isLoading={loading}
        />
      </div>
    </DashboardLayout>
  );
}

