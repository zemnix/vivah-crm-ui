import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, MoreHorizontal, Printer, Trash2 } from "lucide-react";

import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "@/components/dialogs/delete-confirmation-dialog";
import { QuotationPreview } from "@/components/quotation/QuotationPreview";
import { useQuotationStore } from "@/store/quotationStore";
import { useToast } from "@/hooks/use-toast";

interface QuotationPreviewPageProps {
  readonly userRole: "admin" | "staff";
  readonly backPath: string;
  readonly testId: string;
}

export default function QuotationPreviewPage({
  userRole,
  backPath,
  testId,
}: Readonly<QuotationPreviewPageProps>) {
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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      void fetchQuotationById(id);
    }
  }, [id, fetchQuotationById]);

  const handleDownloadPDF = async () => {
    if (!quotation) {
      return;
    }

    const ok = await downloadQuotationPDF(quotation);
    if (!ok) {
      toast({
        title: "Error",
        description: "Failed to download PDF.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!quotation) {
      return;
    }

    setIsDeleting(true);
    try {
      const ok = await deleteQuotation(quotation._id);
      if (!ok) {
        throw new Error("Delete failed");
      }
      toast({
        description: "Quotation deleted successfully.",
      });
      navigate(backPath);
    } catch (err) {
      console.error("Failed to delete quotation:", err);
      toast({
        title: "Error",
        description: "Failed to delete quotation.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading && !quotation) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[680px] w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (error && !quotation) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(backPath)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6" data-testid={testId}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/${userRole}/quotations/${id}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quotation
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">Quotation Preview</h1>
              <p className="text-sm text-muted-foreground">
                {quotation?.quotationNo || "Quotation"} {quotation?.customer?.name ? `- ${quotation.customer.name}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={pdfGenerating}>
              <Download className="h-4 w-4 mr-2" />
              {pdfGenerating ? "Generating..." : "Download PDF"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/${userRole}/quotations/${id}`)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Edit Quotation
                </DropdownMenuItem>
                {userRole === "admin" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => setDeleteDialogOpen(true)}
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

        {quotation ? (
          <QuotationPreview quotation={quotation} onDownloadPDF={handleDownloadPDF} showActions={false} />
        ) : (
          <CardEmpty backPath={backPath} />
        )}

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDelete}
          itemName={quotation?._id}
          itemType="quotation"
          title="Delete Quotation"
          description="Are you sure you want to delete this quotation? This action cannot be undone."
          isLoading={isDeleting}
        />
      </div>
    </DashboardLayout>
  );
}

function CardEmpty({ backPath }: Readonly<{ backPath: string }>) {
  const navigate = useNavigate();

  return (
    <div className="text-center py-16 border rounded-lg">
      <h2 className="text-xl font-semibold">Quotation Not Found</h2>
      <p className="text-muted-foreground mt-2">The quotation does not exist or has been removed.</p>
      <Button className="mt-4" onClick={() => navigate(backPath)}>
        Back to Quotations
      </Button>
    </div>
  );
}
