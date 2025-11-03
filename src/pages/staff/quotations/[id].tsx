import QuotationDetailPage from "@/components/pages/quotation-detail-page";

export default function StaffQuotationDetail() {
  return (
    <QuotationDetailPage
      userRole="staff"
      backPath="/staff/quotations"
      testId="staff-quotation-detail-page"
    />
  );
}

