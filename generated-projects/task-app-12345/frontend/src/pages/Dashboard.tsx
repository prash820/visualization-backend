import React from 'react';
import ProjectList from '../components/ProjectList';
import { useApi } from '../hooks/useApi';

const Dashboard: React.FC = () => {
  const { data: projects, error } = useApi('/projects');

  if (error) return <div>Error loading projects</div>;
  if (!projects) return <div>Loading...</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <ProjectList projects={projects} />
    </div>
  );
};

export default Dashboard;