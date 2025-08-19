// TaskRoutes
// TaskRoutes.tsx

import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import TaskController from './TaskController';
import { TaskService } from './TaskService';
import { Task } from './types';

interface TaskRoutesProps {
  tasks: Task[];
}

const TaskRoutes: React.FC<TaskRoutesProps> = ({ tasks }) => {
  const taskService = new TaskService(tasks);

  return (
    <Router>
      <Switch>
        <Route path="/tasks" exact>
          <TaskController taskService={taskService} />
        </Route>
        <Route path="/tasks/:taskId" exact>
          {({ match }) => {
            const taskId = match?.params.taskId;
            if (!taskId) {
              return <div>Error: Task ID is required</div>;
            }
            return <TaskController taskService={taskService} />;
          }}
        </Route>
        <Route path="*">
          <div>404 Not Found</div>
        </Route>
      </Switch>
    </Router>
  );
};

export default TaskRoutes;
