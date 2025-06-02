import { Request, Response } from 'express';
import User from '../models/User';

export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.userId);
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).send('Server error');
  }
};