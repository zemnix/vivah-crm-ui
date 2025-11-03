import QuotationsPage from "@/components/pages/quotations-page";

export default function AdminQuotations() {
  return (
    <QuotationsPage
      userRole="admin"
      pageTitle="All Quotations"
      pageDescription="View and manage all staff quotations"
      testId="admin-quotations-page"
    />
  );
}

