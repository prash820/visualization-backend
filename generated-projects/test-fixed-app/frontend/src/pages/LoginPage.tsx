// LoginPage.tsx

import React from 'react';
import AuthForm from './AuthForm';
import './LoginPage.css';

interface LoginPageProps {}

const LoginPage: React.FC<LoginPageProps> = () => {
  return (
    <div className="login-page">
      <header className="login-page-header">
        <h1>Login to TestApp</h1>
        <p>Please enter your credentials to access the application.</p>
      </header>
      <main className="login-page-main">
        <AuthForm />
      </main>
    </div>
  );
};

export default LoginPage;

// LoginPage.css

.login-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: #f0f2f5;
  min-height: 100vh;
}

.login-page-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-page-main {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}