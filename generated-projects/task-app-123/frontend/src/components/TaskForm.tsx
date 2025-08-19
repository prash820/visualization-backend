import React, { useState } from 'react';

interface TaskFormProps {
  addTask: (task: { id: string; name: string }) => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ addTask }) => {
  const [taskName, setTaskName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskName.trim()) {
      addTask({ id: Date.now().toString(), name: taskName });
      setTaskName('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        placeholder="Enter task name"
      />
      <button type="submit">Add Task</button>
    </form>
  );
};

export default TaskForm;