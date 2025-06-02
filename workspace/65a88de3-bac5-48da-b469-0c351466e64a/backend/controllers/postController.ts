import { Request, Response } from 'express';
import Post from '../models/Post';

export const createPost = async (req: Request, res: Response) => {
  try {
    const newPost = new Post({
      content: req.body.content,
      imageUrl: req.body.imageUrl,
      owner: req.body.userId,
      createdAt: new Date()
    });
    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).send('Server error');
  }
};