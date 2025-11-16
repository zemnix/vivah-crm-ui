import EnquiriesPage from "@/components/pages/enquiries-page";

export default function AdminEnquiries() {
  return (
    <EnquiriesPage
      userRole="admin"
      pageTitle="All Enquiries"
      pageDescription="Manage all enquiries submitted by leads"
      testId="admin-enquiries-page"
    />
  );
}

