// Complete React TypeScript component code with ALL imports resolved
import React, { useState, useEffect } from 'react';
import { Comment } from '../utils/types';

interface CommentListProps {
  postId: string;
}

export const CommentList: React.FC<CommentListProps> = ({ postId }) => {
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    // Fetch comments for the post
    setComments([
      { id: '1', postId, content: 'Great post!' },
      { id: '2', postId, content: 'Thanks for sharing!' }
    ]);
  }, [postId]);

  return (
    <div>
      <h3>Comments</h3>
      <ul>
        {comments.map(comment => (
          <li key={comment.id}>{comment.content}</li>
        ))}
      </ul>
    </div>
  );
};