import InteractionsPage from "@/components/pages/interactions-page";

export default function StaffInteractions() {
  return (
    <InteractionsPage
      userRole="staff"
      pageTitle="All Interactions"
      pageDescription="Manage all your interactions with leads"
      testId="staff-interactions-page"
    />
  );
}