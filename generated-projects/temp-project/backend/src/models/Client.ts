import { Schema, model, Document } from 'mongoose';
import { z } from 'zod';

export interface Client extends Document {
  
  id: string;
  

  name: string;
  

  email: string;
  

  company: string;
  

  phone: string;
  

  createdAt: Date;
  

  updatedAt: Date;
  
  
  createdAt: Date;
  updatedAt: Date;
}

export const ClientSchema = z.object({
  
  id: {{^required}}z.string().optional(){{/required}},
  

  name: {{^required}}z.string().optional(){{/required}},
  

  email: {{^required}}z.string().optional(){{/required}},
  

  company: {{^required}}z.string().optional(){{/required}},
  

  phone: {{^required}}z.string().optional(){{/required}},
  

  createdAt: {{^required}}z.Date().optional(){{/required}},
  

  updatedAt: {{^required}}z.Date().optional(){{/required}},
  
});

export class ClientModel {
  private static model = model<Client>('Client', new Schema({
    
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
    

    company: {
      type: ,
      required: true,
      
      
    },
    

    phone: {
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

  

  static async findById(id: string): Promise<Client | null> {
    return this.model.findById(id).exec();
  }

  static async create(data: Partial<Client>): Promise<Client> {
    return this.model.create(data);
  }

  static async update(id: string, data: Partial<Client>): Promise<Client | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  static async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }
}

export default ClientModel;