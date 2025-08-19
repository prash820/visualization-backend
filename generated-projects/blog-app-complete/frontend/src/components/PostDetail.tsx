// Complete React TypeScript component code with ALL imports resolved
import React from 'react';
import { Post } from '../utils/types';
import { CommentList } from './CommentList';

interface PostDetailProps {
  post: Post;
  onBack: () => void;
}

export const PostDetail: React.FC<PostDetailProps> = ({ post, onBack }) => {
  return (
    <div>
      <button onClick={onBack}>Back</button>
      <h2>{post.title}</h2>
      <p>{post.content}</p>
      <CommentList postId={post.id} />
    </div>
  );
};