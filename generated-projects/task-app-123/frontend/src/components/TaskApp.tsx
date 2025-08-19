import React, { useState } from 'react';
import TaskList from './TaskList';
import TaskForm from './TaskForm';

interface Task {
  id: string;
  name: string;
}

const TaskApp: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  const addTask = (task: Task) => {
    setTasks([...tasks, task]);
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  return (
    <div>
      <h1>Task Management</h1>
      <TaskForm addTask={addTask} />
      <TaskList tasks={tasks} onRemove={removeTask} />
    </div>
  );
};

export default TaskApp;