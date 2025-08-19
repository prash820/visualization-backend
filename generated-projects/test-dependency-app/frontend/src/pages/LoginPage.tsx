// LoginPage.tsx

import React from 'react';
import AuthForm from './AuthForm';
import { useHistory } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const history = useHistory();

  const handleLoginSuccess = () => {
    // Redirect to the home page or dashboard after successful login
    history.push('/home');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
      <h1>Login to TestApp</h1>
      <AuthForm onLoginSuccess={handleLoginSuccess} />
    </div>
  );
};

export default LoginPage;
