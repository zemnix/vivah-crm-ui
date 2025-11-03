import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Printer, MoreHorizontal, Trash2, AlertCircle } from 'lucide-react';
import { useQuotationStore } from '@/store/quotationStore';
import { useUserStore } from '@/store/admin/userStore';
import { QuotationPreview } from '@/components/quotation/QuotationPreview';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';

interface QuotationPreviewPageProps {
  readonly userRole: 'admin' | 'staff';
  readonly backPath: string;
  readonly testId: string;
}

export default function QuotationPreviewPage({
  userRole,
  backPath,
  testId
}: QuotationPreviewPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const hasFetchedRef = useRef(false);
  
  const {
    selectedQuotation: quotation,
    loading,
    error,
    fetchQuotationById,
    deleteQuotation,
    downloadQuotationPDF,
    pdfGenerating,
  } = useQuotationStore();

  // Business API disabled – PDF service will use defaults
  const { fetchAllUsers } = useUserStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch quotation data on mount (business fetch disabled)
  useEffect(() => {
    if (id && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchQuotationById(id);
    }
  }, [id, fetchQuotationById]);

  // Fetch staff members for admin
  useEffect(() => {
    if (userRole === 'admin') {
      fetchAllUsers();
    }
  }, [userRole, fetchAllUsers]);

  const handleDownloadPDF = async () => {
    if (!quotation) return;
    
    try {
      const success = await downloadQuotationPDF(quotation);
      if (success) {
        toast({
          description: 'PDF downloaded successfully',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to download PDF',
        variant: 'destructive',
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    navigate(`/${userRole}/quotations/${id}`);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!quotation) return;
    
    setIsDeleting(true);
    try {
      await deleteQuotation(quotation._id);
      toast({
        title: "Success",
        description: "Quotation deleted successfully",
      });
      navigate(backPath);
    } catch (error) {
      console.error('Error deleting quotation:', error);
      toast({
        title: "Error",
        description: "Failed to delete quotation",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };


  // Loading state
  if (loading && !quotation) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Quotation Preview</h1>
          </div>
          
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  // No quotation found
  if (!quotation && !loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(backPath)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quotations
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Quotation Preview</h1>
          </div>
          
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground">Quotation Not Found</h2>
            <p className="text-muted-foreground mt-2">The quotation you're looking for doesn't exist.</p>
            <Button onClick={() => navigate(backPath)} className="mt-4">
              Back to Quotations
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6" data-testid={testId}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 print:hidden">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              data-testid="back-button"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quotation
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Quotation Preview</h1>
              <p className="text-muted-foreground">
                {quotation?.quotationNo} - {quotation?.customer?.name}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              data-testid="print-button"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={pdfGenerating}
              data-testid="download-pdf-button"
            >
              <Download className="h-4 w-4 mr-2" />
              {pdfGenerating ? 'Generating...' : 'Download PDF'}
            </Button>
            
            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/${userRole}/quotations/${quotation?._id}`)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Edit Quotation
                </DropdownMenuItem>
                {userRole === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleDelete}
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
        </div>

        {/* Preview Content */}
        {quotation && (
          <QuotationPreview 
            quotation={quotation}
            onDownloadPDF={handleDownloadPDF}
            showActions={false}
            className="max-w-none"
          />
        )}

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          itemName="quotation"
          isLoading={isDeleting}
        />
      </div>
    </DashboardLayout>
  );
}
