// Complete TypeScript type definitions and interfaces
export interface User {
  id: string;
  username: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
}