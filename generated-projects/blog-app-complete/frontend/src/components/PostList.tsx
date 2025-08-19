// Complete React TypeScript component code with ALL imports resolved
import React from 'react';
import { Post } from '../utils/types';

interface PostListProps {
  posts: Post[];
  onSelectPost: (post: Post) => void;
}

export const PostList: React.FC<PostListProps> = ({ posts, onSelectPost }) => {
  return (
    <div>
      <h2>Posts</h2>
      <ul>
        {posts.map(post => (
          <li key={post.id} onClick={() => onSelectPost(post)}>
            {post.title}
          </li>
        ))}
      </ul>
    </div>
  );
};