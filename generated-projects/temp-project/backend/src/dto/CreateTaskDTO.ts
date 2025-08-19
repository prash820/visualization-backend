import { z } from 'zod';

export interface CreateTaskDTO {
  
  id: string;
  

  title: string;
  

  description: string;
  

  status: string;
  

  priority: string;
  

  projectId: string;
  

  assignedTo: string;
  

  dueDate: Date;
  

  createdAt: Date;
  

  updatedAt: Date;
  
}

export const CreateTaskDTOSchema = z.object({
  
  id: z.string(){{^required}}.optional(){{/required}},
  

  title: z.string(){{^required}}.optional(){{/required}},
  

  description: z.string(){{^required}}.optional(){{/required}},
  

  status: z.string(){{^required}}.optional(){{/required}},
  

  priority: z.string(){{^required}}.optional(){{/required}},
  

  projectId: z.string(){{^required}}.optional(){{/required}},
  

  assignedTo: z.string(){{^required}}.optional(){{/required}},
  

  dueDate: z.Date(){{^required}}.optional(){{/required}},
  

  createdAt: z.Date(){{^required}}.optional(){{/required}},
  

  updatedAt: z.Date(){{^required}}.optional(){{/required}},
  
});

export type CreateTaskDTOInput = z.infer<typeof CreateTaskDTOSchema>;