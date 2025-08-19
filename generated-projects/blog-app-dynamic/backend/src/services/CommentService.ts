import { Comment } from '../models/Comment';

export class CommentService {
  async findAll(): Promise<Comment[]> {
    try {
      return await Comment.find().exec();
    } catch (error) {
      console.error('Error fetching Comments:', error);
      throw new Error('Failed to fetch Comments');
    }
  }

  async findById(id: string): Promise<Comment | null> {
    try {
      return await Comment.findById(id).exec();
    } catch (error) {
      console.error('Error fetching Comment:', error);
      return null;
    }
  }

  async create(data: Partial<Comment>): Promise<Comment> {
    try {
      return await Comment.create(data);
    } catch (error) {
      console.error('Error creating Comment:', error);
      throw new Error('Failed to create Comment');
    }
  }

  async update(id: string, data: Partial<Comment>): Promise<Comment | null> {
    try {
      return await Comment.findByIdAndUpdate(id, data, { new: true }).exec();
    } catch (error) {
      console.error('Error updating Comment:', error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await Comment.findByIdAndDelete(id).exec();
      return !!result;
    } catch (error) {
      console.error('Error deleting Comment:', error);
      return false;
    }
  }
}

export default CommentService;