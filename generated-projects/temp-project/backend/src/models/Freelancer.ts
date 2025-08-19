import { Schema, model, Document } from 'mongoose';
import { z } from 'zod';

export interface Freelancer extends Document {
  
  id: string;
  

  name: string;
  

  email: string;
  

  skills: string[];
  

  hourlyRate: number;
  

  portfolio: string;
  

  createdAt: Date;
  

  updatedAt: Date;
  
  
  createdAt: Date;
  updatedAt: Date;
}

export const FreelancerSchema = z.object({
  
  id: {{^required}}z.string().optional(){{/required}},
  

  name: {{^required}}z.string().optional(){{/required}},
  

  email: {{^required}}z.string().optional(){{/required}},
  

  skills: {{^required}}z.string[]().optional(){{/required}},
  

  hourlyRate: {{^required}}z.number().optional(){{/required}},
  

  portfolio: {{^required}}z.string().optional(){{/required}},
  

  createdAt: {{^required}}z.Date().optional(){{/required}},
  

  updatedAt: {{^required}}z.Date().optional(){{/required}},
  
});

export class FreelancerModel {
  private static model = model<Freelancer>('Freelancer', new Schema({
    
    id: {
      type: ,
      required: true,
      
      
    },
    

    name: {
      type: ,
      required: true,
      
      
    },
    

    email: {
      type: ,
      required: true,
      
      
    },
    

    skills: {
      type: ,
      required: true,
      
      
    },
    

    hourlyRate: {
      type: ,
      required: true,
      
      
    },
    

    portfolio: {
      type: ,
      required: true,
      
      
    },
    

    createdAt: {
      type: ,
      required: true,
      
      
    },
    

    updatedAt: {
      type: ,
      required: true,
      
      
    },
    
    
  }, {
    timestamps: true,
  }));

  

  static async findById(id: string): Promise<Freelancer | null> {
    return this.model.findById(id).exec();
  }

  static async create(data: Partial<Freelancer>): Promise<Freelancer> {
    return this.model.create(data);
  }

  static async update(id: string, data: Partial<Freelancer>): Promise<Freelancer | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  static async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }
}

export default FreelancerModel;