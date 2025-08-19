// LoginPage.tsx

import React from 'react';
import AuthForm from './AuthForm';
import { User } from './types';
import { useApi } from './useApi';

interface LoginPageProps {
  users: User[];
}

const LoginPage: React.FC<LoginPageProps> = ({ users }) => {
  const { error: apiError } = useApi(users, [], []);

  if (apiError) {
    return <div className="error-message">Error: {apiError.message}</div>;
  }

  return (
    <div className="login-page">
      <h1>Login to FreelanceApp</h1>
      <AuthForm users={users} />
    </div>
  );
};

export default LoginPage;

// CSS (Assuming CSS-in-JS or a CSS file is used)
// .login-page {
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