// UserModel.tsx

import React, { useState, useEffect } from 'react';
import { User, AppError, UserRole } from './types';
import { findUserById, handleAppError } from './utils';
import { createAppError, ERROR_CODES } from './constants';

interface UserModelProps {
  users: User[];
  userId: string;
}

const UserModel: React.FC<UserModelProps> = ({ users, userId }) => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    try {
      const foundUser = findUserById(users, userId);
      if (!foundUser) {
        throw createAppError('User not found', ERROR_CODES.NOT_FOUND);
      }
      setUser(foundUser);
    } catch (err) {
      setError(err as AppError);
      handleAppError(err as AppError);
    }
  }, [users, userId]);

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>User Details</h1>
      <p>Name: {user.name}</p>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
    </div>
  );
};

export default UserModel;
