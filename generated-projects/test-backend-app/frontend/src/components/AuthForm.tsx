// AuthForm.tsx

import React, { useState } from 'react';
import Input from './Input';
import Button from './Button';
import { useAuth } from './useAuth';
import { AppError } from './types';

interface AuthFormProps {
  users: User[];
}

const AuthForm: React.FC<AuthFormProps> = ({ users }) => {
  const [userId, setUserId] = useState('');
  const { login, logout, user, error } = useAuth(users);

  const handleLogin = async () => {
    try {
      await login(userId);
    } catch (err) {
      console.error('Login failed:', (err as AppError).message);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="auth-form">
      <h1>Auth Form</h1>
      <Input
        label="User ID"
        value={userId}
        onChange={setUserId}
        placeholder="Enter your user ID"
        required
      />
      <Button label="Login" onClick={handleLogin} disabled={!userId} />
      <Button label="Logout" onClick={handleLogout} disabled={!user} />
      {error && <div className="error-message">Error: {error.message}</div>}
      {user && <div>Welcome, {user.name}!</div>}
    </div>
  );
};

export default AuthForm;

// CSS (Assuming CSS-in-JS or a CSS file is used)
// .auth-form {
//   max-width: 400px;
//   margin: 0 auto;
//   padding: 20px;
//   border: 1px solid #ccc;
//   border-radius: 4px;
//   background-color: #f9f9f9;
// }
// .error-message {
//   color: red;
//   margin-top: 10px;
// }