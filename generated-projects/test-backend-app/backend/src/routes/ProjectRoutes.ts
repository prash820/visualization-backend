// ProjectRoutes.tsx

import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import ProjectController from './ProjectController';
import { ProjectService } from './ProjectService';
import { Project } from './types';

interface ProjectRoutesProps {
  projects: Project[];
}

const ProjectRoutes: React.FC<ProjectRoutesProps> = ({ projects }) => {
  const projectService = new ProjectService(projects);

  return (
    <Router>
      <Switch>
        <Route path="/projects" exact>
          <ProjectController projectService={projectService} />
        </Route>
        <Route path="/projects/:projectId" exact>
          {({ match }) => {
            const projectId = match?.params.projectId;
            if (!projectId) {
              return <div>Error: Project ID is required</div>;
            }
            return <ProjectController projectService={projectService} />;
          }}
        </Route>
        <Route path="*">
          <div>404 Not Found</div>
        </Route>
      </Switch>
    </Router>
  );
};

export default ProjectRoutes;
