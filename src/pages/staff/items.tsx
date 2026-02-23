import ItemsPage from "@/components/pages/items-page";

export default function StaffItems() {
  return (
    <ItemsPage
      userRole="staff"
      pageTitle="Item Master"
      pageDescription="Search and create quotation items."
      testId="staff-items-page"
    />
  );
}

