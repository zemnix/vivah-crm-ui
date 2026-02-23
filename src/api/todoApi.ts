import apiClient from './apiClient';

export type TodoView = 'all' | 'assigned' | 'created';
export type TodoStatus = 'pending' | 'completed';

export interface TodoUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface Todo {
  _id: string;
  taskname: string;
  date: string;
  intendedFor: TodoUser;
  createdBy: TodoUser;
  isCompleted: boolean;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TodoPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface TodoListResponse {
  todos: Todo[];
  pagination: TodoPagination;
}

export interface CreateTodoData {
  taskname: string;
  date: string;
  intendedFor: string;
}

export interface UpdateTodoData {
  taskname?: string;
  date?: string;
  intendedFor?: string;
}

export interface GetTodosParams {
  page?: number;
  limit?: number;
  view?: TodoView;
  status?: TodoStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

const handleApiError = (error: any, defaultMessage: string): never => {
  throw new Error(error?.response?.data?.message || defaultMessage);
};

export const createTodoApi = async (todoData: CreateTodoData): Promise<Todo> => {
  try {
    const response = await apiClient.post('/todos', todoData);
    return response.data.data;
  } catch (error) {
    return handleApiError(error, 'Failed to create todo');
  }
};

export const getTodosApi = async (params: GetTodosParams = {}): Promise<TodoListResponse> => {
  try {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));
    if (params.view) queryParams.append('view', params.view);
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);

    const queryString = queryParams.toString();
    const url = queryString ? `/todos?${queryString}` : '/todos';

    const response = await apiClient.get(url);
    return response.data.data;
  } catch (error) {
    return handleApiError(error, 'Failed to fetch todos');
  }
};

export const getTodoByIdApi = async (todoId: string): Promise<Todo> => {
  try {
    const response = await apiClient.get(`/todos/${todoId}`);
    return response.data.data;
  } catch (error) {
    return handleApiError(error, 'Failed to fetch todo');
  }
};

export const updateTodoApi = async (todoId: string, updateData: UpdateTodoData): Promise<Todo> => {
  try {
    const response = await apiClient.put(`/todos/${todoId}`, updateData);
    return response.data.data;
  } catch (error) {
    return handleApiError(error, 'Failed to update todo');
  }
};

export const markTodoCompletionApi = async (todoId: string, isCompleted = true): Promise<Todo> => {
  try {
    const response = await apiClient.patch(`/todos/${todoId}/completion`, { isCompleted });
    return response.data.data;
  } catch (error) {
    return handleApiError(error, 'Failed to update todo completion status');
  }
};

export const deleteTodoApi = async (todoId: string): Promise<{ id: string }> => {
  try {
    const response = await apiClient.delete(`/todos/${todoId}`);
    return response.data.data;
  } catch (error) {
    return handleApiError(error, 'Failed to delete todo');
  }
};
