import { Schema, model, Document } from 'mongoose';
import { z } from 'zod';

export interface User extends Document {
  
  id: string;
  

  email: string;
  

  password: string;
  

  name: string;
  

  role: string;
  

  createdAt: Date;
  

  updatedAt: Date;
  
  
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = z.object({
  
  id: {{^required}}z.string().optional(){{/required}},
  

  email: {{^required}}z.string().optional(){{/required}},
  

  password: {{^required}}z.string().optional(){{/required}},
  

  name: {{^required}}z.string().optional(){{/required}},
  

  role: {{^required}}z.string().optional(){{/required}},
  

  createdAt: {{^required}}z.Date().optional(){{/required}},
  

  updatedAt: {{^required}}z.Date().optional(){{/required}},
  
});

export class UserModel {
  private static model = model<User>('User', new Schema({
    
    id: {
      type: ,
      required: true,
      
      
    },
    

    email: {
      type: ,
      required: true,
      
      
    },
    

    password: {
      type: ,
      required: true,
      
      
    },
    

    name: {
      type: ,
      required: true,
      
      
    },
    

    role: {
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

  

  static async findById(id: string): Promise<User | null> {
    return this.model.findById(id).exec();
  }

  static async create(data: Partial<User>): Promise<User> {
    return this.model.create(data);
  }

  static async update(id: string, data: Partial<User>): Promise<User | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  static async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }
}

export default UserModel;