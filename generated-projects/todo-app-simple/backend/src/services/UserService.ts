import { User } from '../models/User';

export class UserService {
  async findAll(): Promise<User[]> {
    try {
      return await User.find().exec();
    } catch (error) {
      console.error('Error fetching Users:', error);
      throw new Error('Failed to fetch Users');
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      return await User.findById(id).exec();
    } catch (error) {
      console.error('Error fetching User:', error);
      return null;
    }
  }

  async create(data: Partial<User>): Promise<User> {
    try {
      return await User.create(data);
    } catch (error) {
      console.error('Error creating User:', error);
      throw new Error('Failed to create User');
    }
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    try {
      return await User.findByIdAndUpdate(id, data, { new: true }).exec();
    } catch (error) {
      console.error('Error updating User:', error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await User.findByIdAndDelete(id).exec();
      return !!result;
    } catch (error) {
      console.error('Error deleting User:', error);
      return false;
    }
  }
}

export default UserService;