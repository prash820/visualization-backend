export interface User {
  userId: string;
  name: string;
  email: string;
  role: string;
}

export interface Project {
  projectId: string;
  title: string;
  description: string;
  status: string;
}

export interface Task {
  taskId: string;
  projectId: string;
  title: string;
  status: string;
}

export interface Message {
  messageId: string;
  projectId: string;
  senderId: string;
  content: string;
}