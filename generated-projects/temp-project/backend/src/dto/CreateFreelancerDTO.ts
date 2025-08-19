import { z } from 'zod';

export interface CreateFreelancerDTO {
  
  id: string;
  

  name: string;
  

  email: string;
  

  skills: string[];
  

  hourlyRate: number;
  

  portfolio: string;
  

  createdAt: Date;
  

  updatedAt: Date;
  
}

export const CreateFreelancerDTOSchema = z.object({
  
  id: z.string(){{^required}}.optional(){{/required}},
  

  name: z.string(){{^required}}.optional(){{/required}},
  

  email: z.string(){{^required}}.optional(){{/required}},
  

  skills: z.string[](){{^required}}.optional(){{/required}},
  

  hourlyRate: z.number(){{^required}}.optional(){{/required}},
  

  portfolio: z.string(){{^required}}.optional(){{/required}},
  

  createdAt: z.Date(){{^required}}.optional(){{/required}},
  

  updatedAt: z.Date(){{^required}}.optional(){{/required}},
  
});

export type CreateFreelancerDTOInput = z.infer<typeof CreateFreelancerDTOSchema>;