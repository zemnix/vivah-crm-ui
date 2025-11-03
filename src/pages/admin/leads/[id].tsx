import LeadDetailPage from "@/components/pages/lead-detail-page";

export default function AdminLeadDetail() {
  return (
    <LeadDetailPage
      userRole="admin"
      backPath="/admin/leads"
      testId="admin-lead-detail-page"
    />
  );
}