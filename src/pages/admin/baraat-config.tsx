import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Plus, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useBaraatConfigStore } from "@/store/baraatConfigStore";
import { BaraatFieldConfigDialog } from "@/components/dialogs/baraat-field-config-dialog";
import { DeleteConfirmationDialog } from "@/components/dialogs/delete-confirmation-dialog";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { BaraatFieldConfig } from "@/api/baraatConfigApi";

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

  // With simplified baraat config (name only), just use all fields
  const filteredFields = useMemo(() => fields, [fields]);

  const columns = [
    {
      key: 'name',
      header: 'Field Name',
      render: (value: string) => (
        <div className="font-medium">{value}</div>
      ),
      sortable: true,
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


        {/* Fields Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={filteredFields}
              columns={columns}
              searchKey="name"
              searchPlaceholder="Search fields by name..."
              actions={actions}
              isLoading={loading}
              emptyMessage="No fields configured. Add your first field to get started."
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
          description={`Are you sure you want to delete the field "${selectedField?.name}"? This action cannot be undone.`}
        />
      </div>
    </DashboardLayout>
  );
}

