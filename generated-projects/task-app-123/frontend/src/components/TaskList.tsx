import React from 'react';

interface Task {
  id: string;
  name: string;
}

interface TaskListProps {
  tasks: Task[];
  onRemove: (id: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, onRemove }) => {
  return (
    <ul>
      {tasks.map(task => (
        <li key={task.id}>
          {task.name}
          <button onClick={() => onRemove(task.id)}>Remove</button>
        </li>
      ))}
    </ul>
  );
};

export default TaskList;