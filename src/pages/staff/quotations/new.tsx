import NewQuotationPage from "@/components/pages/new-quotation-page";

export default function StaffNewQuotation() {
  return (
    <NewQuotationPage
      userRole="staff"
      backPath="/staff/quotations"
      testId="staff-new-quotation-page"
    />
  );
}

