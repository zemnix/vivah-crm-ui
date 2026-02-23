import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { TodoDialog } from '@/components/dialogs/todo-dialog';
import { useTodoStore } from '@/store/todoStore';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/admin/userStore';
import { useToast } from '@/hooks/use-toast';
import type { Todo, CreateTodoData, UpdateTodoData, TodoView, TodoStatus } from '@/api/todoApi';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  X,
  Filter,
  Calendar as CalendarIcon,
  MoreHorizontal,
  CheckCircle2,
  RotateCcw,
  Edit,
  Trash2
} from 'lucide-react';

interface TodosPageProps {
  readonly userRole: 'admin' | 'staff';
  readonly pageTitle: string;
  readonly pageDescription: string;
  readonly testId: string;
}

type TodoDialogMode = 'create' | 'edit';
type TodoStatusFilter = TodoStatus | 'all';

const formatDate = (date: string) => {
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
};

const formatDateToLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TodoFilterBar = ({
  viewFilter,
  statusFilter,
  searchTerm,
  dateFrom,
  dateTo,
  filtersExpanded,
  setFiltersExpanded,
  setSearchTerm,
  setViewFilter,
  setStatusFilter,
  handleDateRangeChange,
  resetFilters
}: {
  viewFilter: TodoView;
  statusFilter: TodoStatusFilter;
  searchTerm: string;
  dateFrom: string;
  dateTo: string;
  filtersExpanded: boolean;
  setFiltersExpanded: (value: boolean) => void;
  setSearchTerm: (value: string) => void;
  setViewFilter: (value: TodoView) => void;
  setStatusFilter: (value: TodoStatusFilter) => void;
  handleDateRangeChange: (from: string, to: string) => void;
  resetFilters: () => void;
}) => (
  <div className="bg-card border border-border rounded-lg shadow-sm mb-4">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 pb-2 gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Filters</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs font-medium">
            {viewFilter === 'all' ? 'Assigned + Created' : viewFilter === 'assigned' ? 'Assigned To Me' : 'Created By Me'}
          </Badge>
          <Badge variant="outline" className="text-xs font-medium">
            {statusFilter === 'all' ? 'All statuses' : statusFilter}
          </Badge>
          {(dateFrom || dateTo) && (
            <Badge variant="outline" className="text-xs font-medium">
              Date range
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
        >
          {filtersExpanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>
    </div>

    {filtersExpanded && (
      <div className="p-3 sm:p-4 pt-2">
        <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-6">
          <div className="flex-1 w-full">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Search
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by task name..."
                className="pl-9 pr-8 h-8 text-xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="w-full lg:w-auto lg:flex-shrink-0">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Scope
            </div>
            <Select value={viewFilter} onValueChange={setViewFilter}>
              <SelectTrigger className="h-8 text-xs font-normal w-full lg:w-48">
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Assigned + Created</SelectItem>
                <SelectItem value="assigned">Assigned To Me</SelectItem>
                <SelectItem value="created">Created By Me</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full lg:w-auto lg:flex-shrink-0">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Status
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs font-normal w-full lg:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="all">All Statuses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full lg:w-auto lg:flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Date Range
              </div>
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDateRangeChange('', '')}
                  className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-8 text-xs w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {dateFrom ? new Date(dateFrom).toLocaleDateString() : 'From date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[1000]" align="start" side="bottom" sideOffset={4}>
                    <Calendar
                      mode="single"
                      selected={dateFrom ? new Date(dateFrom) : undefined}
                      onSelect={(date) => handleDateRangeChange(date ? formatDateToLocal(date) : '', dateTo)}
                      disabled={(date) =>
                        date > new Date() || (dateTo ? date > new Date(dateTo) : false)
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <span className="text-xs text-gray-400 text-center sm:hidden">to</span>
              <span className="text-xs text-gray-400 hidden sm:inline">to</span>
              <div className="flex-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-8 text-xs w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {dateTo ? new Date(dateTo).toLocaleDateString() : 'To date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[1000]" align="start" side="bottom" sideOffset={4}>
                    <Calendar
                      mode="single"
                      selected={dateTo ? new Date(dateTo) : undefined}
                      onSelect={(date) => handleDateRangeChange(dateFrom, date ? formatDateToLocal(date) : '')}
                      disabled={(date) =>
                        date > new Date() || (dateFrom ? date < new Date(dateFrom) : false)
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);

export default function TodosPage({
  userRole,
  pageTitle,
  pageDescription,
  testId
}: TodosPageProps) {
  const [viewFilter, setViewFilter] = useState<TodoView>('all');
  const [statusFilter, setStatusFilter] = useState<TodoStatusFilter>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<TodoDialogMode>('create');
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const { user } = useAuthStore();

  const {
    todos,
    pagination,
    loading,
    error,
    fetchTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    markTodoCompletion,
    clearError
  } = useTodoStore();

  const { users, fetchAllUsers } = useUserStore();

  useEffect(() => {
    fetchAllUsers({ limit: 1000 });
  }, [fetchAllUsers]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const fetchTodoList = async () => {
    await fetchTodos({
      page: currentPage,
      limit: pageSize,
      view: viewFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: debouncedSearchTerm || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined
    });
  };

  useEffect(() => {
    fetchTodoList();
  }, [currentPage, pageSize, viewFilter, statusFilter, debouncedSearchTerm, dateFrom, dateTo]);

  useEffect(() => {
    if (!error) return;
    toast({
      title: 'Error',
      description: error,
      variant: 'destructive'
    });
    clearError();
  }, [error, toast, clearError]);

  const assignableUsers = useMemo(
    () => users.filter((u) => u.role === 'admin' || u.role === 'staff'),
    [users]
  );

  const resetFilters = () => {
    setViewFilter('all');
    setStatusFilter('pending');
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const handleDateRangeChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    setCurrentPage(1);
  };

  const handleCreateClick = () => {
    setDialogMode('create');
    setSelectedTodo(null);
    setDialogOpen(true);
  };

  const handleEditClick = (todo: Todo) => {
    setDialogMode('edit');
    setSelectedTodo(todo);
    setDialogOpen(true);
  };

  const handleDeleteClick = (todo: Todo) => {
    setSelectedTodo(todo);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTodo) return;

    const success = await deleteTodo(selectedTodo._id);
    if (!success) {
      toast({
        title: 'Error',
        description: 'Failed to delete todo',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Todo deleted successfully'
    });
    setDeleteDialogOpen(false);
    setSelectedTodo(null);
    await fetchTodoList();
  };

  const handleDialogSubmit = async (payload: CreateTodoData | UpdateTodoData) => {
    setIsSubmitting(true);
    try {
      if (dialogMode === 'create') {
        const created = await createTodo(payload as CreateTodoData);
        if (!created) {
          toast({
            title: 'Error',
            description: 'Failed to create todo',
            variant: 'destructive'
          });
          return;
        }
        toast({
          title: 'Success',
          description: 'Todo created successfully'
        });
      } else if (selectedTodo) {
        const updated = await updateTodo(selectedTodo._id, payload as UpdateTodoData);
        if (!updated) {
          toast({
            title: 'Error',
            description: 'Failed to update todo',
            variant: 'destructive'
          });
          return;
        }
        toast({
          title: 'Success',
          description: 'Todo updated successfully'
        });
      }

      setDialogOpen(false);
      setSelectedTodo(null);
      await fetchTodoList();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompletionToggle = async (todo: Todo) => {
    const updated = await markTodoCompletion(todo._id, !todo.isCompleted);
    if (!updated) {
      toast({
        title: 'Error',
        description: 'Failed to update todo status',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Success',
      description: updated.isCompleted ? 'Todo marked as complete' : 'Todo moved back to pending'
    });
    await fetchTodoList();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const columns = [
    {
      key: 'taskname',
      header: 'Task',
      render: (_value: string, item: Todo) => (
        <div className="space-y-1">
          <div
            className={cn(
              'font-medium text-foreground',
              item.isCompleted && 'line-through text-muted-foreground'
            )}
          >
            {item.taskname}
          </div>
          <div className="text-xs text-muted-foreground">
            Due: {formatDate(item.date)}
          </div>
        </div>
      )
    },
    {
      key: 'intendedFor',
      header: 'Assigned To',
      render: (_value: unknown, item: Todo) => (
        <div className="text-sm">
          <div className="font-medium">{item.intendedFor?.name || '-'}</div>
          <div className="text-xs text-muted-foreground">{item.intendedFor?.role || ''}</div>
        </div>
      )
    },
    {
      key: 'createdBy',
      header: 'Created By',
      render: (_value: unknown, item: Todo) => (
        <div className="text-sm">
          <div className="font-medium">{item.createdBy?.name || '-'}</div>
          <div className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</div>
        </div>
      )
    },
    {
      key: 'isCompleted',
      header: 'Status',
      render: (_value: boolean, item: Todo) => (
        <div className="space-y-1">
          <Badge variant={item.isCompleted ? 'default' : 'secondary'}>
            {item.isCompleted ? 'Completed' : 'Pending'}
          </Badge>
          {item.isCompleted && item.completedAt && (
            <div className="text-xs text-muted-foreground">
              Done on {formatDate(item.completedAt)}
            </div>
          )}
        </div>
      )
    }
  ];

  const actions = (todo: Todo) => {
    const canComplete = user?.id === todo.intendedFor?._id;
    const canModify = user?.id === todo.createdBy?._id || user?.role === 'admin';

    if (!canComplete && !canModify) {
      return <span className="text-xs text-muted-foreground">No actions</span>;
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canComplete && (
            <DropdownMenuItem onClick={() => handleCompletionToggle(todo)}>
              {todo.isCompleted ? (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Mark Pending
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark Complete
                </>
              )}
            </DropdownMenuItem>
          )}
          {canModify && (
            <DropdownMenuItem onClick={() => handleEditClick(todo)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          {canModify && (
            <DropdownMenuItem onClick={() => handleDeleteClick(todo)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8" data-testid={testId}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{pageTitle}</h1>
            <p className="text-muted-foreground mt-2">
              {pageDescription} ({userRole === 'admin' ? 'Admin workspace' : 'Staff workspace'})
            </p>
          </div>
          <Button onClick={handleCreateClick} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Create Todo
          </Button>
        </div>

        <TodoFilterBar
          viewFilter={viewFilter}
          statusFilter={statusFilter}
          searchTerm={searchTerm}
          dateFrom={dateFrom}
          dateTo={dateTo}
          filtersExpanded={filtersExpanded}
          setFiltersExpanded={setFiltersExpanded}
          setSearchTerm={setSearchTerm}
          setViewFilter={(value) => {
            setViewFilter(value);
            setCurrentPage(1);
          }}
          setStatusFilter={(value) => {
            setStatusFilter(value);
            setCurrentPage(1);
          }}
          handleDateRangeChange={handleDateRangeChange}
          resetFilters={resetFilters}
        />

        <Card>
          <CardContent className="p-4 sm:p-6">
            <DataTable
              data={todos}
              columns={columns}
              actions={actions}
              isLoading={loading}
              emptyMessage="No todos found. Create a task to get started."
              rowClassName={(item) =>
                item.isCompleted
                  ? 'bg-emerald-200/75 dark:bg-emerald-900/55'
                  : 'bg-orange-200/75 dark:bg-orange-900/55'
              }
              serverSide
              currentPage={pagination?.currentPage || 1}
              totalPages={pagination?.totalPages || 1}
              pageSize={pagination?.itemsPerPage || pageSize}
              totalItems={pagination?.totalItems || 0}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </CardContent>
        </Card>

        <TodoDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedTodo(null);
            }
          }}
          mode={dialogMode}
          todo={selectedTodo}
          users={assignableUsers}
          defaultAssigneeId={user?.id}
          isSubmitting={isSubmitting}
          onSubmit={handleDialogSubmit}
        />

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDeleteConfirm}
          title="Delete Todo"
          description="Are you sure you want to delete this todo? This action cannot be undone."
          itemName={selectedTodo?.taskname || ''}
          itemType="todo"
          isLoading={loading}
        />
      </div>
    </DashboardLayout>
  );
}
