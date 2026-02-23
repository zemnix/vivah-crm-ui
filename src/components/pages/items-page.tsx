import { useEffect, useMemo, useState } from "react";
import { Edit, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";

import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "@/components/dialogs/delete-confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { createItemApi, deleteItemApi, getItemsApi, type Item, updateItemApi } from "@/api/itemApi";

type DialogMode = "create" | "edit";

interface ItemsPageProps {
  readonly userRole: "admin" | "staff";
  readonly pageTitle: string;
  readonly pageDescription: string;
  readonly testId: string;
}

const normalizeItemName = (value: string): string => value.trim().replace(/\s+/g, " ");

export default function ItemsPage({
  userRole,
  pageTitle,
  pageDescription,
  testId,
}: Readonly<ItemsPageProps>) {
  const { toast } = useToast();
  const canEditOrDelete = userRole === "admin";

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("create");
  const [itemNameInput, setItemNameInput] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const fetchItems = async (search = "") => {
    setLoading(true);
    try {
      const data = await getItemsApi({
        search: search || undefined,
        limit: 100,
      });
      setItems(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch items.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchItems(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  const openCreateDialog = () => {
    setDialogMode("create");
    setSelectedItem(null);
    setItemNameInput("");
    setDialogOpen(true);
  };

  const openEditDialog = (item: Item) => {
    setDialogMode("edit");
    setSelectedItem(item);
    setItemNameInput(item.name);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const normalizedName = normalizeItemName(itemNameInput);
    if (!normalizedName) {
      toast({
        title: "Validation",
        description: "Item name is required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (dialogMode === "create") {
        await createItemApi({ name: normalizedName });
        toast({ description: "Item saved to item master." });
      } else if (selectedItem) {
        await updateItemApi(selectedItem._id, { name: normalizedName });
        toast({ description: "Item updated successfully." });
      }

      setDialogOpen(false);
      setSelectedItem(null);
      setItemNameInput("");
      await fetchItems(debouncedSearchTerm);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save item.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (item: Item) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) {
      return;
    }

    setDeleteLoading(true);
    try {
      await deleteItemApi(itemToDelete._id);
      toast({ description: "Item deleted successfully." });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      await fetchItems(debouncedSearchTerm);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete item.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "name",
        header: "Item Name",
        render: (value: string) => <div className="font-medium text-foreground">{value}</div>,
        sortable: true,
      },
      {
        key: "createdAt",
        header: "Created On",
        render: (value: string) =>
          new Date(value).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        sortable: true,
      },
      {
        key: "updatedAt",
        header: "Last Updated",
        render: (value: string) =>
          new Date(value).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        sortable: true,
      },
    ],
    []
  );

  const actions = canEditOrDelete
    ? (item: Item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditDialog(item)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openDeleteDialog(item)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    : undefined;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6" data-testid={testId}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{pageTitle}</h1>
            <p className="text-muted-foreground mt-2">{pageDescription}</p>
          </div>
          <Button onClick={openCreateDialog} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search items..."
                className="pl-10"
              />
            </div>

            <DataTable
              data={items}
              columns={columns}
              isLoading={loading}
              actions={actions}
              showPageSizeSelector={false}
              emptyMessage="No items found. Create your first item to get started."
            />
          </CardContent>
        </Card>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (saving) {
              return;
            }
            setDialogOpen(open);
            if (!open) {
              setSelectedItem(null);
              setItemNameInput("");
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{dialogMode === "create" ? "Create Item" : "Edit Item"}</DialogTitle>
              <DialogDescription>
                {dialogMode === "create"
                  ? "Add a new item to your item master."
                  : "Update the selected item name."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="item-name">Item Name</Label>
              <Input
                id="item-name"
                value={itemNameInput}
                onChange={(event) => setItemNameInput(event.target.value)}
                placeholder="Enter item name"
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  if (!saving) {
                    setDialogOpen(false);
                  }
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Saving..." : dialogMode === "create" ? "Create" : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDelete}
          title="Delete Item"
          description="Are you sure you want to delete this item? This action cannot be undone."
          itemName={itemToDelete?.name || ""}
          itemType="item"
          isLoading={deleteLoading}
        />
      </div>
    </DashboardLayout>
  );
}

