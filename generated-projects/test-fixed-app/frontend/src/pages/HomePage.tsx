// HomePage.tsx

import React from 'react';
import AuthForm from './AuthForm';
import DataForm from './DataForm';
import DataList from './DataList';
import './HomePage.css';

interface HomePageProps {}

const HomePage: React.FC<HomePageProps> = () => {
  return (
    <div className="home-page">
      <header className="home-page-header">
        <h1>Welcome to TestApp</h1>
        <p>A test application</p>
      </header>
      <main className="home-page-main">
        <section className="auth-section">
          <AuthForm />
        </section>
        <section className="data-section">
          <DataForm />
          <DataList />
        </section>
      </main>
    </div>
  );
};

export default HomePage;

// HomePage.css

.home-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: #f0f2f5;
  min-height: 100vh;
}

.home-page-header {
  text-align: center;
  margin-bottom: 40px;
}

.home-page-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 800px;
}

.auth-section,
.data-section {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
