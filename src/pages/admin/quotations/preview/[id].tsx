import QuotationPreviewPage from "@/components/pages/quotation-preview-page";

export default function AdminQuotationPreview() {
  return (
    <QuotationPreviewPage
      userRole="admin"
      backPath="/admin/quotations"
      testId="admin-quotation-preview-page"
    />
  );
}

