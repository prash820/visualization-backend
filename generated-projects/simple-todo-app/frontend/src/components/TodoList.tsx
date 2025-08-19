// Complete React TypeScript component code
import React from 'react';
import { Todo } from '../types';
import TodoItem from './TodoItem';

interface TodoListProps {
  todos: Todo[];
  onEdit: (id: string, updatedTodo: Todo) => void;
  onDelete: (id: string) => void;
}

const TodoList: React.FC<TodoListProps> = ({ todos, onEdit, onDelete }) => {
  return (
    <ul>
      {todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </ul>
  );
};

export default TodoList;
