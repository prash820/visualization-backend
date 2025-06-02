import React, { useEffect, useState } from 'react';
import { fetchAllPosts } from '../utils/api';

const PostList = () => {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const loadPosts = async () => {
      const allPosts = await fetchAllPosts();
      setPosts(allPosts);
    };
    loadPosts();
  }, []);

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

export default PostList;