import { z } from 'zod';

export interface CreateUserDTO {
  
  id: string;
  

  email: string;
  

  password: string;
  

  name: string;
  

  role: string;
  

  createdAt: Date;
  

  updatedAt: Date;
  
}

export const CreateUserDTOSchema = z.object({
  
  id: z.string(){{^required}}.optional(){{/required}},
  

  email: z.string(){{^required}}.optional(){{/required}},
  

  password: z.string(){{^required}}.optional(){{/required}},
  

  name: z.string(){{^required}}.optional(){{/required}},
  

  role: z.string(){{^required}}.optional(){{/required}},
  

  createdAt: z.Date(){{^required}}.optional(){{/required}},
  

  updatedAt: z.Date(){{^required}}.optional(){{/required}},
  
});

export type CreateUserDTOInput = z.infer<typeof CreateUserDTOSchema>;