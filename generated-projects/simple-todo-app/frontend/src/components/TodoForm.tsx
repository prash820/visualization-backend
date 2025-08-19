// Complete React TypeScript component code
import React, { useState } from 'react';
import { Todo } from '../types';

interface TodoFormProps {
  addTodo: (todo: Todo) => void;
}

const TodoForm: React.FC<TodoFormProps> = ({ addTodo }) => {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title) {
      addTodo({ id: Date.now().toString(), title });
      setTitle('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a new task" />
      <button type="submit">Add</button>
    </form>
  );
};

export default TodoForm;
