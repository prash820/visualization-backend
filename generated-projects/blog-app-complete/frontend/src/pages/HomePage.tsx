// Complete page component code with proper routing
import React from 'react';
import BlogApp from '../components/BlogApp';

const HomePage: React.FC = () => {
  return (
    <div>
      <h1>Welcome to BlogSphere</h1>
      <BlogApp />
    </div>
  );
};

export default HomePage;