import LeadsPage from "@/components/pages/leads-page";

export default function StaffLeads() {
  return (
    <LeadsPage
      userRole="staff"
      pageTitle="My Leads"
      pageDescription="Manage and track your assigned leads"
      testId="staff-leads-page"
    />
  );
}