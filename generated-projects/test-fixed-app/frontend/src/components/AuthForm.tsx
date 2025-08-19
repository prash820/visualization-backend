// AuthForm.tsx

import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';
import { useAuth } from './useAuth';

interface AuthFormProps {}

const AuthForm: React.FC<AuthFormProps> = () => {
  const { login, error, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const handleLogin = async () => {
    if (!username || !password) {
      setFormError('Username and password are required');
      return;
    }
    setFormError('');
    try {
      await login({ username, password });
    } catch (err) {
      setFormError('Login failed');
    }
  };

  return (
    <div className="auth-form">
      <h2>Login</h2>
      <Input
        type="text"
        placeholder="Username"
        value={username}
        onChange={setUsername}
        error={formError}
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={setPassword}
        error={formError}
      />
      {formError && <div className="error-message">{formError}</div>}
      {error && <div className="error-message">{error}</div>}
      <Button label="Login" onClick={handleLogin} disabled={loading} />
    </div>
  );
};

export default AuthForm;

// AuthForm.css

.auth-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f9f9f9;
}

.error-message {
  color: #ff4d4f;
  font-size: 14px;
  margin-top: 10px;
}