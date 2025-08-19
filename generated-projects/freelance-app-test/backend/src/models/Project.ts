import { Schema, model, Document } from 'mongoose';
import { z } from 'zod';

export interface Project extends Document {
  
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
  
  
  createdAt: Date;
  updatedAt: Date;
}

export const ProjectSchema = z.object({
  
  id: {{^required}}z.string().optional(){{/required}},
  

  title: {{^required}}z.string().optional(){{/required}},
  

  description: {{^required}}z.string().optional(){{/required}},
  

  status: {{^required}}z.string().optional(){{/required}},
  

  budget: {{^required}}z.number().optional(){{/required}},
  

  deadline: {{^required}}z.Date().optional(){{/required}},
  

  clientId: {{^required}}z.string().optional(){{/required}},
  

  freelancerId: {{^required}}z.string().optional(){{/required}},
  

  createdAt: {{^required}}z.Date().optional(){{/required}},
  

  updatedAt: {{^required}}z.Date().optional(){{/required}},
  
});

export class ProjectModel {
  private static model = model<Project>('Project', new Schema({
    
    id: {
      type: ,
      required: true,
      
      
    },
    

    title: {
      type: ,
      required: true,
      
      
    },
    

    description: {
      type: ,
      required: true,
      
      
    },
    

    status: {
      type: ,
      required: true,
      
      
    },
    

    budget: {
      type: ,
      required: true,
      
      
    },
    

    deadline: {
      type: ,
      required: true,
      
      
    },
    

    clientId: {
      type: ,
      required: true,
      
      
    },
    

    freelancerId: {
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

  

  static async findById(id: string): Promise<Project | null> {
    return this.model.findById(id).exec();
  }

  static async create(data: Partial<Project>): Promise<Project> {
    return this.model.create(data);
  }

  static async update(id: string, data: Partial<Project>): Promise<Project | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  static async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }
}

export default ProjectModel;