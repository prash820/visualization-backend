import { Post } from '../models/Post';

export class PostService {
  async findAll(): Promise<Post[]> {
    try {
      return await Post.find().exec();
    } catch (error) {
      console.error('Error fetching Posts:', error);
      throw new Error('Failed to fetch Posts');
    }
  }

  async findById(id: string): Promise<Post | null> {
    try {
      return await Post.findById(id).exec();
    } catch (error) {
      console.error('Error fetching Post:', error);
      return null;
    }
  }

  async create(data: Partial<Post>): Promise<Post> {
    try {
      return await Post.create(data);
    } catch (error) {
      console.error('Error creating Post:', error);
      throw new Error('Failed to create Post');
    }
  }

  async update(id: string, data: Partial<Post>): Promise<Post | null> {
    try {
      return await Post.findByIdAndUpdate(id, data, { new: true }).exec();
    } catch (error) {
      console.error('Error updating Post:', error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await Post.findByIdAndDelete(id).exec();
      return !!result;
    } catch (error) {
      console.error('Error deleting Post:', error);
      return false;
    }
  }
}

export default PostService;