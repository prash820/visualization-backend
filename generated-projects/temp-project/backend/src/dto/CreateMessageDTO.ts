import { z } from 'zod';

export interface CreateMessageDTO {
  
  id: string;
  

  content: string;
  

  senderId: string;
  

  receiverId: string;
  

  projectId: string;
  

  isRead: boolean;
  

  createdAt: Date;
  

  updatedAt: Date;
  
}

export const CreateMessageDTOSchema = z.object({
  
  id: z.string(){{^required}}.optional(){{/required}},
  

  content: z.string(){{^required}}.optional(){{/required}},
  

  senderId: z.string(){{^required}}.optional(){{/required}},
  

  receiverId: z.string(){{^required}}.optional(){{/required}},
  

  projectId: z.string(){{^required}}.optional(){{/required}},
  

  isRead: z.boolean(){{^required}}.optional(){{/required}},
  

  createdAt: z.Date(){{^required}}.optional(){{/required}},
  

  updatedAt: z.Date(){{^required}}.optional(){{/required}},
  
});

export type CreateMessageDTOInput = z.infer<typeof CreateMessageDTOSchema>;