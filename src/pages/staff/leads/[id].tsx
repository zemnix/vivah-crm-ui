import LeadDetailPage from "@/components/pages/lead-detail-page";

export default function StaffLeadDetail() {
  return (
    <LeadDetailPage
      userRole="staff"
      backPath="/staff/leads"
      testId="staff-lead-detail-page"
    />
  );
}