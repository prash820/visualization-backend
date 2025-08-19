// Complete React TypeScript component code with ALL imports resolved
import React, { useState, useEffect } from 'react';
import { PostList } from './PostList';
import { PostDetail } from './PostDetail';
import { Auth } from './Auth';
import { User, Post } from '../utils/types';

const BlogApp: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const login = (credentials: { username: string; password: string }) => {
    // Simulate login
    setUser({ id: '1', username: credentials.username });
  };

  const logout = () => {
    setUser(null);
  };

  useEffect(() => {
    // Fetch posts
    setPosts([
      { id: '1', title: 'First Post', content: 'This is the first post' },
      { id: '2', title: 'Second Post', content: 'This is the second post' }
    ]);
  }, []);

  return (
    <div>
      <Auth user={user} login={login} logout={logout} />
      {selectedPost ? (
        <PostDetail post={selectedPost} onBack={() => setSelectedPost(null)} />
      ) : (
        <PostList posts={posts} onSelectPost={setSelectedPost} />
      )}
    </div>
  );
};

export default BlogApp;