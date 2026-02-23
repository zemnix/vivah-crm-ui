import ItemsPage from "@/components/pages/items-page";

export default function AdminItems() {
  return (
    <ItemsPage
      userRole="admin"
      pageTitle="Item Master"
      pageDescription="Create, search, update, and delete quotation items."
      testId="admin-items-page"
    />
  );
}

