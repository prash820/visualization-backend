import React from 'react';
import { useEffect, useState } from 'react';
import { fetchUserPosts } from '../utils/api';

const UserProfile = ({ userId }) => {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const loadPosts = async () => {
      const userPosts = await fetchUserPosts(userId);
      setPosts(userPosts);
    };
    loadPosts();
  }, [userId]);

  return (
    <div>
      {posts.map((post) => (
        <div key={post.id}>
          <img src={post.imageUrl} alt='Post' />
          <p>{post.content}</p>
        </div>
      ))}
    </div>
  );
};

export default UserProfile;