import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, MoreHorizontal, Filter } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useBaraatConfigStore } from "@/store/baraatConfigStore";
import { BaraatFieldConfigDialog } from "@/components/dialogs/baraat-field-config-dialog";
import { DeleteConfirmationDialog } from "@/components/dialogs/delete-confirmation-dialog";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { BaraatFieldConfig, FieldType } from "@/api/baraatConfigApi";

export default function AdminBaraatConfig() {
  const {
    fields,
    loading,
    error,
    fetchAllFields,
    deleteField,
    clearError,
  } = useBaraatConfigStore();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<BaraatFieldConfig | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedStatuses, setSelectedStatuses] = useState<('active' | 'inactive')[]>(['active', 'inactive']);
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    fetchAllFields();
  }, [fetchAllFields]);

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
    setSelectedField(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleEdit = (field: BaraatFieldConfig) => {
    setSelectedField(field);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleDelete = (field: BaraatFieldConfig) => {
    setSelectedField(field);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedField) return;

    const success = await deleteField(selectedField._id, false);
    if (success) {
      toast({
        title: "Success",
        description: "Field deleted successfully",
      });
      setDeleteDialogOpen(false);
      setSelectedField(null);
    } else {
      toast({
        title: "Error",
        description: "Failed to delete field",
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = (success: boolean) => {
    setDialogOpen(false);
    setSelectedField(null);
    if (success) {
      toast({
        title: "Success",
        description: dialogMode === 'create' ? "Field created successfully" : "Field updated successfully",
      });
    }
  };

  // Filter fields based on selected statuses
  const filteredFields = useMemo(() => {
    if (selectedStatuses.length === 2) {
      return fields; // Show all if both are selected
    }
    return fields.filter(field => {
      if (selectedStatuses.includes('active') && field.isActive) return true;
      if (selectedStatuses.includes('inactive') && !field.isActive) return true;
      return false;
    });
  }, [fields, selectedStatuses]);

  const handleStatusToggle = (status: 'active' | 'inactive') => {
    if (selectedStatuses.length === 1 && selectedStatuses[0] === status) {
      toast({
        title: "At least one status must be selected",
        variant: "destructive"
      });
      return;
    }

    setSelectedStatuses(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  const clearFilters = () => {
    setSelectedStatuses(['active', 'inactive']);
  };

  const getFieldTypeBadge = (type: FieldType) => {
    const variants: Record<FieldType, "default" | "secondary" | "outline"> = {
      text: "default",
      number: "secondary",
      textarea: "outline",
      dropdown: "default",
    };
    return variants[type] || "default";
  };

  const columns = [
    {
      key: 'label',
      header: 'Label',
      render: (value: string) => (
        <div className="font-medium">{value}</div>
      ),
      sortable: true,
    },
    {
      key: 'key',
      header: 'Key',
      render: (value: string) => (
        <code className="text-xs bg-muted px-2 py-1 rounded">{value}</code>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (value: FieldType) => (
        <Badge variant={getFieldTypeBadge(value)}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'required',
      header: 'Required',
      render: (value: boolean) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: 'order',
      header: 'Order',
      render: (value: number) => (
        <span className="text-muted-foreground">{value}</span>
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
  ];

  const actions = (field: BaraatFieldConfig) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleEdit(field)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleDelete(field)}
          className="text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Baraat Field Configuration</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage custom fields for baraat details in leads
            </p>
          </div>
          <Button onClick={handleCreate} className="mt-4 sm:mt-0">
            <Plus className="h-4 w-4 mr-2" />
            Add New Field
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
                  <Badge variant="outline" className="text-xs font-medium">
                    {selectedStatuses.length === 2 ? 'All' : selectedStatuses.length} status{selectedStatuses.length !== 1 ? 'es' : ''}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(selectedStatuses.length < 2) && (
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
                    Field Status
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center space-x-1.5">
                      <Checkbox
                        id="status-active"
                        checked={selectedStatuses.includes('active')}
                        onCheckedChange={() => handleStatusToggle('active')}
                        className="h-3.5 w-3.5 cursor-pointer"
                      />
                      <label
                        htmlFor="status-active"
                        className={`text-sm cursor-pointer select-none ${
                          selectedStatuses.includes('active')
                            ? 'text-foreground font-medium'
                            : 'text-muted-foreground'
                        }`}
                      >
                        Active
                      </label>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Checkbox
                        id="status-inactive"
                        checked={selectedStatuses.includes('inactive')}
                        onCheckedChange={() => handleStatusToggle('inactive')}
                        className="h-3.5 w-3.5 cursor-pointer"
                      />
                      <label
                        htmlFor="status-inactive"
                        className={`text-sm cursor-pointer select-none ${
                          selectedStatuses.includes('inactive')
                            ? 'text-foreground font-medium'
                            : 'text-muted-foreground'
                        }`}
                      >
                        Inactive
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fields Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedStatuses.length === 2 
                ? 'All Fields' 
                : selectedStatuses.includes('active') 
                  ? 'Active Fields' 
                  : 'Inactive Fields'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={filteredFields}
              columns={columns}
              searchKey="label"
              searchPlaceholder="Search fields by label..."
              actions={actions}
              isLoading={loading}
              emptyMessage={
                selectedStatuses.length === 0
                  ? "No fields match the selected filters."
                  : "No fields configured. Add your first field to get started."
              }
            />
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <BaraatFieldConfigDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          field={selectedField}
          mode={dialogMode}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDelete}
          title="Delete Field"
          description={`Are you sure you want to delete the field "${selectedField?.label}"? This will deactivate the field and it will no longer appear in forms.`}
        />
      </div>
    </DashboardLayout>
  );
}

