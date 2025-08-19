// Complete React TypeScript component code with ALL imports resolved
import React from 'react';
import { User } from '../utils/types';

interface AuthProps {
  user: User | null;
  login: (credentials: { username: string; password: string }) => void;
  logout: () => void;
}

export const Auth: React.FC<AuthProps> = ({ user, login, logout }) => {
  const handleLogin = () => {
    login({ username: 'test', password: 'password' });
  };

  return (
    <div>
      {user ? (
        <div>
          <span>Welcome, {user.username}</span>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
};