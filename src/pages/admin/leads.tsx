import LeadsPage from "@/components/pages/leads-page";

export default function AdminLeads() {
  return (
    <LeadsPage
      userRole="admin"
      pageTitle="All Leads"
      pageDescription="Manage all leads across the organization"
      testId="admin-leads-page"
    />
  );
}