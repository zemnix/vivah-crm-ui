import EnquiriesPage from "@/components/pages/enquiries-page";

export default function StaffEnquiries() {
  return (
    <EnquiriesPage
      userRole="staff"
      pageTitle="Enquiries"
      pageDescription="View and manage enquiries"
      testId="staff-enquiries-page"
    />
  );
}

