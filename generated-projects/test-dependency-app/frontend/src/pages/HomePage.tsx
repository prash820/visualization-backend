// HomePage.tsx

import React from 'react';
import AuthForm from './AuthForm';
import DataForm from './DataForm';
import DataList from './DataList';
import useAuth from './useAuth';

const HomePage: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLoginSuccess = () => {
    console.log('Login successful');
  };

  const handleDataSubmitSuccess = (data: any) => {
    console.log('Data submitted successfully:', data);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>Welcome to TestApp</h1>
      {!user ? (
        <AuthForm onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div>
          <button onClick={logout} style={{ marginBottom: '20px', padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px' }}>Logout</button>
          <DataForm endpoint="/api/data" onSubmitSuccess={handleDataSubmitSuccess} />
          <DataList endpoint="/api/data" />
        </div>
      )}
    </div>
  );
};

export default HomePage;
