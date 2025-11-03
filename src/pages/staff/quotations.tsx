import QuotationsPage from "@/components/pages/quotations-page";

export default function StaffQuotations() {
  return (
    <QuotationsPage
      userRole="staff"
      pageTitle="My Quotations"
      pageDescription="View and manage your quotations"
      testId="staff-quotations-page"
    />
  );
}

