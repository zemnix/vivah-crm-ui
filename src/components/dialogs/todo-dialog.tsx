import { useEffect, useState } from 'react';
import type { User } from '@/api/userApi';
import type { Todo, CreateTodoData, UpdateTodoData } from '@/api/todoApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TodoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  todo?: Todo | null;
  users: User[];
  defaultAssigneeId?: string;
  isSubmitting: boolean;
  onSubmit: (payload: CreateTodoData | UpdateTodoData) => Promise<void>;
}

const formatDateToInput = (date: string) => {
  const dateObj = new Date(date);
  const year = dateObj.getUTCFullYear();
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTomorrowInputDate = () => {
  const dateObj = new Date();
  dateObj.setDate(dateObj.getDate() + 1);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function TodoDialog({
  open,
  onOpenChange,
  mode,
  todo,
  users,
  defaultAssigneeId,
  isSubmitting,
  onSubmit
}: TodoDialogProps) {
  const [taskname, setTaskname] = useState('');
  const [date, setDate] = useState('');
  const [intendedFor, setIntendedFor] = useState('');

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && todo) {
      setTaskname(todo.taskname || '');
      setDate(todo.date ? formatDateToInput(todo.date) : '');
      setIntendedFor(todo.intendedFor?._id || '');
      return;
    }

    setTaskname('');
    setDate(getTomorrowInputDate());
    setIntendedFor(defaultAssigneeId || users[0]?._id || '');
  }, [open, mode, todo, defaultAssigneeId, users]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!taskname.trim() || !date || !intendedFor) {
      return;
    }

    const payload = {
      taskname: taskname.trim(),
      date: new Date(`${date}T12:00:00.000Z`).toISOString(),
      intendedFor
    };

    await onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Todo' : 'Edit Todo'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="todo-taskname">Task Name *</Label>
            <Input
              id="todo-taskname"
              placeholder="Enter task details"
              value={taskname}
              onChange={(e) => setTaskname(e.target.value)}
              maxLength={200}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="todo-date">Due Date *</Label>
            <Input
              id="todo-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Assign To *</Label>
            <Select value={intendedFor} onValueChange={setIntendedFor} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user._id} value={user._id}>
                    {user.name} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !taskname.trim() || !date || !intendedFor}
            >
              {isSubmitting
                ? mode === 'create'
                  ? 'Creating...'
                  : 'Updating...'
                : mode === 'create'
                ? 'Create'
                : 'Update'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
