import QuotationDetailPage from "@/components/pages/quotation-detail-page";

export default function AdminQuotationDetail() {
  return (
    <QuotationDetailPage
      userRole="admin"
      backPath="/admin/quotations"
      testId="admin-quotation-detail-page"
    />
  );
}

