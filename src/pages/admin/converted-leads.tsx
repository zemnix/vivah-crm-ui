import ConvertedLeadsPage from "@/components/pages/converted-leads-page";

export default function AdminConvertedLeads() {
  return (
    <ConvertedLeadsPage
      userRole="admin"
      pageTitle="Converted Leads"
      pageDescription="View all converted leads"
      testId="admin-converted-leads-page"
    />
  );
}

