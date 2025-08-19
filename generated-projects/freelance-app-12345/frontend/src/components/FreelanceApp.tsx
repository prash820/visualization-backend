import React, { useState } from 'react';
import { Dashboard } from './Dashboard';
import { ProjectList } from './ProjectList';
import { MessagingBox } from './MessagingBox';

export const FreelanceApp: React.FC = () => {
  const [user, setUser] = useState(null);

  const login = (email: string, password: string) => {
    // Implement login logic
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <div>
      {user ? (
        <>
          <Dashboard />
          <ProjectList />
          <MessagingBox />
        </>
      ) : (
        <div>Please log in</div>
      )}
    </div>
  );
};