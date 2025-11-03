import InteractionsPage from "@/components/pages/interactions-page";

export default function AdminInteractions() {
  return (
    <InteractionsPage
      userRole="admin"
      pageTitle="All Interactions"
      pageDescription="Manage all staff interactions with leads"
      testId="admin-interactions-page"
    />
  );
}
