// Complete React TypeScript component code
import React from 'react';
import { Todo } from '../types';

interface TodoItemProps {
  todo: Todo;
  onEdit: (id: string, updatedTodo: Todo) => void;
  onDelete: (id: string) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onEdit, onDelete }) => {
  return (
    <li>
      {todo.title}
      <button onClick={() => onDelete(todo.id)}>Delete</button>
    </li>
  );
};

export default TodoItem;
