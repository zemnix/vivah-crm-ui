import LeadsPage from "./leads-page";

interface ConvertedLeadsPageProps {
  readonly userRole: 'admin' | 'staff';
  readonly pageTitle: string;
  readonly pageDescription: string;
  readonly testId: string;
}

// Wrapper component that forces status filter to 'converted'
export default function ConvertedLeadsPage({
  userRole,
  pageTitle,
  pageDescription,
  testId
}: ConvertedLeadsPageProps) {
  return (
    <LeadsPage
      userRole={userRole}
      pageTitle={pageTitle}
      pageDescription={pageDescription}
      testId={testId}
      initialStatus="converted"
    />
  );
}

