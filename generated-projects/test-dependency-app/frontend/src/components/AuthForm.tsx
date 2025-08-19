// AuthForm.tsx

import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';
import useAuth from './useAuth';

interface AuthFormProps {
  onLoginSuccess: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, loading } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '400px', margin: '0 auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Login</h2>
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={setEmail}
        disabled={loading}
        error={error}
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={setPassword}
        disabled={loading}
        error={error}
      />
      <Button
        label={loading ? 'Logging in...' : 'Login'}
        onClick={handleSubmit}
        disabled={loading}
      />
      {error && <div style={{ color: 'red', marginTop: '10px', textAlign: 'center' }}>{error}</div>}
    </form>
  );
};

export default AuthForm;
