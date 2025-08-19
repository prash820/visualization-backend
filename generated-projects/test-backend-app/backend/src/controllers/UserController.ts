// UserController.tsx

import React, { useState, useEffect } from 'react';
import { User, AppError, UserRole } from './types';
import { UserService } from './UserService';
import { handleAppError, createAppError } from './utils';
import { ERROR_CODES } from './constants';

interface UserControllerProps {
  userService: UserService;
}

const UserController: React.FC<UserControllerProps> = ({ userService }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const allUsers = userService.getUsersByRole('freelancer'); // Example role
      setUsers(allUsers);
    } catch (err) {
      const appError = createAppError('Failed to fetch users', ERROR_CODES.GENERIC_ERROR);
      setError(appError);
      handleAppError(appError);
    }
  }, [userService]);

  const handleSelectUser = (userId: string) => {
    try {
      const user = userService.getUserById(userId);
      if (!user) {
        throw createAppError('User not found', ERROR_CODES.NOT_FOUND);
      }
      setSelectedUser(user);
    } catch (err) {
      const appError = err as AppError;
      setError(appError);
      handleAppError(appError);
    }
  };

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>User Management</h1>
      <ul>
        {users.map(user => (
          <li key={user.id} onClick={() => handleSelectUser(user.id)}>
            {user.name} ({user.role})
          </li>
        ))}
      </ul>
      {selectedUser && (
        <div>
          <h2>Selected User</h2>
          <p>Name: {selectedUser.name}</p>
          <p>Email: {selectedUser.email}</p>
          <p>Role: {selectedUser.role}</p>
        </div>
      )}
    </div>
  );
};

export default UserController;
