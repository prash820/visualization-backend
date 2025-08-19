import { Task } from '../models/Task';

export class TaskService {
  async findAll(): Promise<Task[]> {
    try {
      return await Task.find().exec();
    } catch (error) {
      console.error('Error fetching Tasks:', error);
      throw new Error('Failed to fetch Tasks');
    }
  }

  async findById(id: string): Promise<Task | null> {
    try {
      return await Task.findById(id).exec();
    } catch (error) {
      console.error('Error fetching Task:', error);
      return null;
    }
  }

  async create(data: Partial<Task>): Promise<Task> {
    try {
      return await Task.create(data);
    } catch (error) {
      console.error('Error creating Task:', error);
      throw new Error('Failed to create Task');
    }
  }

  async update(id: string, data: Partial<Task>): Promise<Task | null> {
    try {
      return await Task.findByIdAndUpdate(id, data, { new: true }).exec();
    } catch (error) {
      console.error('Error updating Task:', error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await Task.findByIdAndDelete(id).exec();
      return !!result;
    } catch (error) {
      console.error('Error deleting Task:', error);
      return false;
    }
  }
}

export default TaskService;