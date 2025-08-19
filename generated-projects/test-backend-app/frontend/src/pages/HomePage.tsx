// HomePage.tsx

import React from 'react';
import AuthForm from './AuthForm';
import DataList from './DataList';
import { useApi } from './useApi';
import { User, Project, Task, AppError } from './types';

interface HomePageProps {
  users: User[];
  projects: Project[];
  tasks: Task[];
}

const HomePage: React.FC<HomePageProps> = ({ users, projects, tasks }) => {
  const { error: apiError } = useApi(users, projects, tasks);

  if (apiError) {
    return <div className="error-message">Error: {apiError.message}</div>;
  }

  return (
    <div className="homepage">
      <h1>Welcome to FreelanceApp</h1>
      <AuthForm users={users} />
      <div className="data-sections">
        <section>
          <h2>Users</h2>
          <DataList type="users" data={users} />
        </section>
        <section>
          <h2>Projects</h2>
          <DataList type="projects" data={projects} />
        </section>
        <section>
          <h2>Tasks</h2>
          <DataList type="tasks" data={tasks} />
        </section>
      </div>
    </div>
  );
};

export default HomePage;

// CSS (Assuming CSS-in-JS or a CSS file is used)
// .homepage {
//   max-width: 1200px;
//   margin: 0 auto;
//   padding: 20px;
//   background-color: #f9f9f9;
// }
// .data-sections {
//   display: flex;
//   justify-content: space-around;
//   margin-top: 20px;
// }
// .error-message {
//   color: red;
//   margin-top: 10px;
// }