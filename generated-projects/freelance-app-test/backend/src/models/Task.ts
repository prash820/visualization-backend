import { Schema, model, Document } from 'mongoose';
import { z } from 'zod';

export interface Task extends Document {
  
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
  
  
  createdAt: Date;
  updatedAt: Date;
}

export const TaskSchema = z.object({
  
  id: {{^required}}z.string().optional(){{/required}},
  

  title: {{^required}}z.string().optional(){{/required}},
  

  description: {{^required}}z.string().optional(){{/required}},
  

  status: {{^required}}z.string().optional(){{/required}},
  

  priority: {{^required}}z.string().optional(){{/required}},
  

  projectId: {{^required}}z.string().optional(){{/required}},
  

  assignedTo: {{^required}}z.string().optional(){{/required}},
  

  dueDate: {{^required}}z.Date().optional(){{/required}},
  

  createdAt: {{^required}}z.Date().optional(){{/required}},
  

  updatedAt: {{^required}}z.Date().optional(){{/required}},
  
});

export class TaskModel {
  private static model = model<Task>('Task', new Schema({
    
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
    

    priority: {
      type: ,
      required: true,
      
      
    },
    

    projectId: {
      type: ,
      required: true,
      
      
    },
    

    assignedTo: {
      type: ,
      required: true,
      
      
    },
    

    dueDate: {
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

  

  static async findById(id: string): Promise<Task | null> {
    return this.model.findById(id).exec();
  }

  static async create(data: Partial<Task>): Promise<Task> {
    return this.model.create(data);
  }

  static async update(id: string, data: Partial<Task>): Promise<Task | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  static async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }
}

export default TaskModel;