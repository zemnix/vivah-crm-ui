import React, { useEffect, useState } from 'react';
import { useMachineStore } from '../../store/machineStore';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Skeleton } from '../../components/ui/skeleton';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  
} from '../../components/ui/alert-dialog';
import { Plus, Search, Edit, Trash2, AlertCircle, ArrowLeft, Calendar, Clock } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

const ProductMaster: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const {
    machines,
    loading,
    error,
    fetchMachines,
    createMachine,
    updateMachine,
    deleteMachine,
    clearError
  } = useMachineStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<any>(null);
  const [deletingMachine, setDeletingMachine] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // Date formatting function
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) {
      return 'Not available';
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  // Filter machines based on search term
  const filteredMachines = machines.filter(machine =>
    machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (machine.description && machine.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddMachine = async () => {
    if (!formData.name.trim()) return;

    const result = await createMachine({
      name: formData.name,
      description: formData.description || undefined
    });

    if (result) {
      setFormData({ name: '', description: '' });
      setIsAddDialogOpen(false);
    }
  };

  const handleEditMachine = async () => {
    if (!editingMachine || !formData.name.trim()) return;

    const result = await updateMachine(editingMachine._id, {
      name: formData.name,
      description: formData.description || undefined
    });

    if (result) {
      setFormData({ name: '', description: '' });
      setEditingMachine(null);
      setIsEditDialogOpen(false);
    }
  };

  const handleDeleteMachine = (machine: any) => {
    setDeletingMachine(machine);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteMachine = async () => {
    if (deletingMachine) {
      await deleteMachine(deletingMachine._id);
      setDeletingMachine(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const openEditDialog = (machine: any) => {
    setEditingMachine(machine);
    setFormData({
      name: machine.name,
      description: machine.description || ''
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingMachine(null);
  };

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access denied. This page is only available for admin users.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Product Master
              </h1>
              <p className="text-muted-foreground">
                Manage your product catalog and machine inventory
              </p>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={resetForm}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter product description"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddMachine} disabled={loading}>
                    {loading ? 'Adding...' : 'Add Product'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button
                variant="outline"
                size="sm"
                onClick={clearError}
                className="ml-2"
              >
                Clear
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Search and Stats */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                {filteredMachines.length} product{filteredMachines.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </div>

        {/* Products List */}
        <div className="grid gap-4">
          {loading && machines.length === 0 ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredMachines.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  {searchTerm ? 'No products found matching your search.' : 'No products found. Add your first product to get started.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredMachines.map((machine) => (
              <Card key={machine._id} className="hover:shadow-lg transition-all duration-200 border-slate-200 bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900 truncate">{machine.name}</h3>
                      {machine.description && (
                        <p className="text-slate-600 text-sm mt-1 line-clamp-2">{machine.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Created: {formatDate(machine.createdAt)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Updated: {formatDate(machine.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(machine)}
                        className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => handleDeleteMachine(machine)}
                         disabled={loading}
                         className="hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Product Name *</Label>
                <Input
                  className="mt-2"
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  className="mt-2"
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEditMachine} disabled={loading}>
                  {loading ? 'Updating...' : 'Update Product'}
                </Button>
              </div>
            </div>
          </DialogContent>
         </Dialog>

         {/* Delete Confirmation Dialog */}
         <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
           <AlertDialogContent>
             <AlertDialogHeader>
               <AlertDialogTitle>Delete Product</AlertDialogTitle>
               <AlertDialogDescription>
                 Are you sure you want to delete "{deletingMachine?.name}"? This action cannot be undone.
               </AlertDialogDescription>
             </AlertDialogHeader>
             <AlertDialogFooter>
               <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
                 Cancel
               </AlertDialogCancel>
               <AlertDialogAction
                 onClick={confirmDeleteMachine}
                 className="bg-red-600 hover:bg-red-700 text-white"
                 disabled={loading}
               >
                 {loading ? 'Deleting...' : 'Delete'}
               </AlertDialogAction>
             </AlertDialogFooter>
           </AlertDialogContent>
         </AlertDialog>
       </div>
     </div>
   );
 };

export default ProductMaster;
