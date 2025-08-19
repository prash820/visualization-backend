import { z } from 'zod';

export interface CreateProjectDTO {
  
  id: string;
  

  title: string;
  

  description: string;
  

  status: string;
  

  budget: number;
  

  deadline: Date;
  

  clientId: string;
  

  freelancerId: string;
  

  createdAt: Date;
  

  updatedAt: Date;
  
}

export const CreateProjectDTOSchema = z.object({
  
  id: z.string(){{^required}}.optional(){{/required}},
  

  title: z.string(){{^required}}.optional(){{/required}},
  

  description: z.string(){{^required}}.optional(){{/required}},
  

  status: z.string(){{^required}}.optional(){{/required}},
  

  budget: z.number(){{^required}}.optional(){{/required}},
  

  deadline: z.Date(){{^required}}.optional(){{/required}},
  

  clientId: z.string(){{^required}}.optional(){{/required}},
  

  freelancerId: z.string(){{^required}}.optional(){{/required}},
  

  createdAt: z.Date(){{^required}}.optional(){{/required}},
  

  updatedAt: z.Date(){{^required}}.optional(){{/required}},
  
});

export type CreateProjectDTOInput = z.infer<typeof CreateProjectDTOSchema>;