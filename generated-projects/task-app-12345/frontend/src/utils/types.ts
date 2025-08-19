export interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
}

export interface Task {
  id: string;
  title: string;
  status: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
}