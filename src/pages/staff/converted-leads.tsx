import ConvertedLeadsPage from "@/components/pages/converted-leads-page";

export default function StaffConvertedLeads() {
  return (
    <ConvertedLeadsPage
      userRole="staff"
      pageTitle="Converted Leads"
      pageDescription="View your converted leads"
      testId="staff-converted-leads-page"
    />
  );
}

