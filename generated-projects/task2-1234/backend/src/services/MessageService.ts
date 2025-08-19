import { {{.MM{{^lastMM, {{/lastMM } from '../models';

export class MessageService {
  
  constructor(private {{dependencyNameMM: {{dependencyTypeMM) {M
  

  
  async findAll(): Promise<Message[]> {
    // BEGIN-AI findAll
    /* AI will generate the method implementation */
    import { Message } from '../models/Message';
import { getRepository } from 'typeorm';

class MessageService {
  async findAll(): Promise<Message[]> {
    try {
      const messageRepository = getRepository(Message);
      const messages = await messageRepository.find();
      return messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw new Error('Could not fetch messages');
    }
  }
}

export default MessageService;
    // END-AI
  }
  

  async findById(): Promise<Message | null> {
    // BEGIN-AI findById
    /* AI will generate the method implementation */
    import { Message } from '../models/Message';
import { Database } from '../database';

class MessageService {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  public async findById(id: string): Promise<Message | null> {
    try {
      const query = 'SELECT * FROM messages WHERE id = $1';
      const result = await this.db.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const messageData = result.rows[0];
      const message: Message = {
        id: messageData.id,
        content: messageData.content,
        senderId: messageData.sender_id,
        receiverId: messageData.receiver_id,
        projectId: messageData.project_id,
        isRead: messageData.is_read,
        createdAt: messageData.created_at,
        updatedAt: messageData.updated_at,
      };

      return message;
    } catch (error) {
      console.error('Error fetching message by ID:', error);
      throw new Error('Could not fetch message');
    }
  }
}

export { MessageService };
    // END-AI
  }
  

  async create(): Promise<Message> {
    // BEGIN-AI create
    /* AI will generate the method implementation */
    import { Message } from '../models/Message';
import { v4 as uuidv4 } from 'uuid';

class MessageService {
  async create(data: Partial<Message>): Promise<Message> {
    try {
      // Validate required fields
      if (!data.content || !data.senderId || !data.receiverId || !data.projectId) {
        throw new Error('Missing required fields');
      }

      // Create new message instance
      const newMessage: Message = {
        id: uuidv4(),
        content: data.content,
        senderId: data.senderId,
        receiverId: data.receiverId,
        projectId: data.projectId,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Insert the new message into the database
      const result = await db('messages').insert(newMessage).returning('*');
      return result[0];
    } catch (error) {
      console.error('Error creating message:', error);
      throw new Error('Unable to create message');
    }
  }
}

export default MessageService;
    // END-AI
  }
  

  async update(): Promise<Message | null> {
    // BEGIN-AI update
    /* AI will generate the method implementation */
    async update(id: string, data: Partial<Message>): Promise<Message | null> {
  try {
    // Find the existing message by ID
    const existingMessage = await this.messageRepository.findById(id);
    if (!existingMessage) {
      throw new Error(`Message with ID ${id} not found`);
    }

    // Update the message fields with the new data
    const updatedMessageData = {
      ...existingMessage,
      ...data,
      updatedAt: new Date(),
    };

    // Save the updated message
    const updatedMessage = await this.messageRepository.update(id, updatedMessageData);

    return updatedMessage;
  } catch (error) {
    console.error(`Error updating message with ID ${id}:`, error);
    throw new Error('Failed to update message');
  }
}
    // END-AI
  }
  

  async delete(): Promise<boolean> {
    // BEGIN-AI delete
    /* AI will generate the method implementation */
    import { getRepository } from 'typeorm';
import { Message } from '../models/Message';

export class MessageService {
  // Other methods...

  public async delete(id: string): Promise<boolean> {
    const messageRepository = getRepository(Message);

    try {
      const result = await messageRepository.delete(id);
      return result.affected !== 0;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw new Error('Could not delete message');
    }
  }
}
    // END-AI
  }
  
}

export default MessageService;