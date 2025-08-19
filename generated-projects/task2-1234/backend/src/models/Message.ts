import { Schema, model, Document } from 'mongoose';
import { z } from 'zod';

export interface Message extends Document {
  
  id: string;
  

  content: string;
  

  senderId: string;
  

  receiverId: string;
  

  projectId: string;
  

  isRead: boolean;
  

  createdAt: Date;
  

  updatedAt: Date;
  
  
  createdAt: Date;
  updatedAt: Date;
}

export const MessageSchema = z.object({
  
  id: {{^required}}z.string().optional(){{/required}},
  

  content: {{^required}}z.string().optional(){{/required}},
  

  senderId: {{^required}}z.string().optional(){{/required}},
  

  receiverId: {{^required}}z.string().optional(){{/required}},
  

  projectId: {{^required}}z.string().optional(){{/required}},
  

  isRead: {{^required}}z.boolean().optional(){{/required}},
  

  createdAt: {{^required}}z.Date().optional(){{/required}},
  

  updatedAt: {{^required}}z.Date().optional(){{/required}},
  
});

export class MessageModel {
  private static model = model<Message>('Message', new Schema({
    
    id: {
      type: ,
      required: true,
      
      
    },
    

    content: {
      type: ,
      required: true,
      
      
    },
    

    senderId: {
      type: ,
      required: true,
      
      
    },
    

    receiverId: {
      type: ,
      required: true,
      
      
    },
    

    projectId: {
      type: ,
      required: true,
      
      
    },
    

    isRead: {
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

  

  static async findById(id: string): Promise<Message | null> {
    return this.model.findById(id).exec();
  }

  static async create(data: Partial<Message>): Promise<Message> {
    return this.model.create(data);
  }

  static async update(id: string, data: Partial<Message>): Promise<Message | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  static async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }
}

export default MessageModel;