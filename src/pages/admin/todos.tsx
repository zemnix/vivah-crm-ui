import TodosPage from '@/components/pages/todos-page';

export default function AdminTodos() {
  return (
    <TodosPage
      userRole="admin"
      pageTitle="Todo Board"
      pageDescription="Create and track personal/team action items"
      testId="admin-todos-page"
    />
  );
}
