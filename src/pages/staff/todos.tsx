import TodosPage from '@/components/pages/todos-page';

export default function StaffTodos() {
  return (
    <TodosPage
      userRole="staff"
      pageTitle="My Todo Board"
      pageDescription="Manage your assigned and created tasks"
      testId="staff-todos-page"
    />
  );
}
