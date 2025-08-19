import React from 'react';
import { Todo } from '../utils/types';

interface TodoItemProps {
  todo: Todo;
  onDelete: (id: string) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onDelete }) => {
  return (
    <li>
      {todo.task}
      <button onClick={() => onDelete(todo.id)}>Delete</button>
    </li>
  );
};

export default TodoItem;