import { z } from 'zod';

export interface CreateClientDTO {
  
  id: string;
  

  name: string;
  

  email: string;
  

  company: string;
  

  phone: string;
  

  createdAt: Date;
  

  updatedAt: Date;
  
}

export const CreateClientDTOSchema = z.object({
  
  id: z.string(){{^required}}.optional(){{/required}},
  

  name: z.string(){{^required}}.optional(){{/required}},
  

  email: z.string(){{^required}}.optional(){{/required}},
  

  company: z.string(){{^required}}.optional(){{/required}},
  

  phone: z.string(){{^required}}.optional(){{/required}},
  

  createdAt: z.Date(){{^required}}.optional(){{/required}},
  

  updatedAt: z.Date(){{^required}}.optional(){{/required}},
  
});

export type CreateClientDTOInput = z.infer<typeof CreateClientDTOSchema>;