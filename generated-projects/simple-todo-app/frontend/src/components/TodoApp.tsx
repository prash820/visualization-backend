// Complete React TypeScript component code
import React, { useState } from 'react';
import TodoList from './TodoList';
import TodoForm from './TodoForm';
import { Todo } from '../types';

const TodoApp: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);

  const addTodo = (todo: Todo) => {
    setTodos([...todos, todo]);
  };

  const editTodo = (id: string, updatedTodo: Todo) => {
    setTodos(todos.map(todo => (todo.id === id ? updatedTodo : todo)));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div>
      <h1>TaskMaster</h1>
      <TodoForm addTodo={addTodo} />
      <TodoList todos={todos} onEdit={editTodo} onDelete={deleteTodo} />
    </div>
  );
};

export default TodoApp;
