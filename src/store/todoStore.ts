import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  Todo,
  TodoListResponse,
  GetTodosParams,
  CreateTodoData,
  UpdateTodoData,
  createTodoApi,
  getTodosApi,
  getTodoByIdApi,
  updateTodoApi,
  deleteTodoApi,
  markTodoCompletionApi
} from '@/api/todoApi';

interface TodoStore {
  todos: Todo[];
  selectedTodo: Todo | null;
  pagination: TodoListResponse['pagination'] | null;
  loading: boolean;
  error: string | null;
  filters: GetTodosParams;

  setTodos: (todos: Todo[]) => void;
  setSelectedTodo: (todo: Todo | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<GetTodosParams>) => void;
  clearError: () => void;

  fetchTodos: (params?: GetTodosParams) => Promise<void>;
  fetchTodoById: (todoId: string) => Promise<Todo | null>;
  createTodo: (todoData: CreateTodoData) => Promise<Todo | null>;
  updateTodo: (todoId: string, updateData: UpdateTodoData) => Promise<Todo | null>;
  deleteTodo: (todoId: string) => Promise<boolean>;
  markTodoCompletion: (todoId: string, isCompleted?: boolean) => Promise<Todo | null>;
  refreshTodos: () => Promise<void>;
  resetStore: () => void;
}

const initialFilters: GetTodosParams = {
  page: 1,
  limit: 10,
  view: 'all'
};

const initialState = {
  todos: [],
  selectedTodo: null,
  pagination: null,
  loading: false,
  error: null,
  filters: initialFilters
};

export const useTodoStore = create<TodoStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setTodos: (todos) => set({ todos }),
      setSelectedTodo: (todo) => set({ selectedTodo: todo }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),
      clearError: () => set({ error: null }),

      fetchTodos: async (params) => {
        set({ loading: true, error: null });
        try {
          const queryParams = { ...get().filters, ...params };
          const response = await getTodosApi(queryParams);
          set({
            todos: response.todos,
            pagination: response.pagination,
            filters: queryParams,
            loading: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch todos',
            loading: false
          });
        }
      },

      fetchTodoById: async (todoId) => {
        set({ loading: true, error: null });
        try {
          const todo = await getTodoByIdApi(todoId);
          set({ selectedTodo: todo, loading: false });
          return todo;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch todo',
            loading: false,
            selectedTodo: null
          });
          return null;
        }
      },

      createTodo: async (todoData) => {
        set({ loading: true, error: null });
        try {
          const todo = await createTodoApi(todoData);
          set({ loading: false });
          return todo;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create todo',
            loading: false
          });
          return null;
        }
      },

      updateTodo: async (todoId, updateData) => {
        set({ loading: true, error: null });
        try {
          const updatedTodo = await updateTodoApi(todoId, updateData);
          const currentTodos = get().todos;
          set({
            todos: currentTodos.map((todo) => (todo._id === todoId ? updatedTodo : todo)),
            selectedTodo: get().selectedTodo?._id === todoId ? updatedTodo : get().selectedTodo,
            loading: false
          });
          return updatedTodo;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update todo',
            loading: false
          });
          return null;
        }
      },

      deleteTodo: async (todoId) => {
        set({ loading: true, error: null });
        try {
          await deleteTodoApi(todoId);
          const currentTodos = get().todos;
          set({
            todos: currentTodos.filter((todo) => todo._id !== todoId),
            selectedTodo: get().selectedTodo?._id === todoId ? null : get().selectedTodo,
            loading: false
          });
          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete todo',
            loading: false
          });
          return false;
        }
      },

      markTodoCompletion: async (todoId, isCompleted = true) => {
        set({ loading: true, error: null });
        try {
          const updatedTodo = await markTodoCompletionApi(todoId, isCompleted);
          const currentTodos = get().todos;
          set({
            todos: currentTodos.map((todo) => (todo._id === todoId ? updatedTodo : todo)),
            selectedTodo: get().selectedTodo?._id === todoId ? updatedTodo : get().selectedTodo,
            loading: false
          });
          return updatedTodo;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update todo completion status',
            loading: false
          });
          return null;
        }
      },

      refreshTodos: async () => {
        await get().fetchTodos(get().filters);
      },

      resetStore: () => {
        set(initialState);
      }
    }),
    { name: 'todo-store' }
  )
);
