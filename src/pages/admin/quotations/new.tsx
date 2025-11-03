import NewQuotationPage from "@/components/pages/new-quotation-page";

export default function AdminNewQuotation() {
  return (
    <NewQuotationPage
      userRole="admin"
      backPath="/admin/quotations"
      testId="admin-new-quotation-page"
    />
  );
}

