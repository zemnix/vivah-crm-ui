import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, MoreHorizontal, Filter } from "lucide-react";
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
  const [selectedStatuses, setSelectedStatuses] = useState<('active' | 'inactive')[]>(['active', 'inactive']);
  const [showFilters, setShowFilters] = useState(true);

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
        description: "SFX config deactivated successfully",
      });
      setDeleteDialogOpen(false);
      setSelectedSfx(null);
    } else {
      toast({
        title: "Error",
        description: "Failed to deactivate SFX config",
        variant: "destructive",
      });
    }
  };

  // Filter SFX configs based on selected statuses
  const filteredSfxConfigs = useMemo(() => {
    if (selectedStatuses.length === 2) {
      return sfxConfigs; // Show all if both are selected
    }
    return sfxConfigs.filter((sfx) => {
      if (selectedStatuses.includes('active')) {
        return sfx.isActive;
      }
      if (selectedStatuses.includes('inactive')) {
        return !sfx.isActive;
      }
      return false;
    });
  }, [sfxConfigs, selectedStatuses]);

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
      key: 'quantity',
      header: 'Quantity',
      render: (value: number) => (
        <div className="text-sm text-muted-foreground">{value}</div>
      ),
      sortable: true,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (value: boolean) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Active" : "Inactive"}
        </Badge>
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
              Manage special effects (SFX) configurations with name and quantity
            </p>
          </div>
          <Button onClick={handleCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add SFX
          </Button>
        </div>

        {/* Filter Bar */}
        <Card>
          <CardContent className="p-3 sm:p-4 pb-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Filters</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedStatuses.length < 2 && (
                    <Badge variant="outline" className="text-xs font-medium">
                      {selectedStatuses.includes('active') ? 'Active' : 'Inactive'}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
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
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="filter-active"
                      checked={selectedStatuses.includes('active')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStatuses([...selectedStatuses, 'active']);
                        } else {
                          setSelectedStatuses(selectedStatuses.filter(s => s !== 'active'));
                        }
                      }}
                    />
                    <label
                      htmlFor="filter-active"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Active
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="filter-inactive"
                      checked={selectedStatuses.includes('inactive')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStatuses([...selectedStatuses, 'inactive']);
                        } else {
                          setSelectedStatuses(selectedStatuses.filter(s => s !== 'inactive'));
                        }
                      }}
                    />
                    <label
                      htmlFor="filter-inactive"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Inactive
                    </label>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
          title="Deactivate SFX Config"
          description="Are you sure you want to deactivate this SFX config? It will no longer appear in dropdowns, but existing data will still have access to it."
          itemName={selectedSfx?.name || ""}
          itemType="SFX config"
          isLoading={loading}
        />
      </div>
    </DashboardLayout>
  );
}

