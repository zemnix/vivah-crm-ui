import QuotationPreviewPage from "@/components/pages/quotation-preview-page";

export default function StaffQuotationPreview() {
  return (
    <QuotationPreviewPage
      userRole="staff"
      backPath="/staff/quotations"
      testId="staff-quotation-preview-page"
    />
  );
}

