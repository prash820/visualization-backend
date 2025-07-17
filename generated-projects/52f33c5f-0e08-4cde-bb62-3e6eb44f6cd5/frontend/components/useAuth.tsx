import { useState } from 'react';
import { login, register } from '../services/auth';

export const useAuth = () => {
  const [user, setUser] = useState(null);

  const loginUser = async (credentials) => {
    const userData = await login(credentials);
    setUser(userData);
  };

  const registerUser = async (userData) => {
    const newUser = await register(userData);
    setUser(newUser);
  };

  return { user, loginUser, registerUser };
};