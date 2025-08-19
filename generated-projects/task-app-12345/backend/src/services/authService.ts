import { User } from '../models/userModel';
import jwt from 'jsonwebtoken';

export const loginUser = async (email: string, password: string) => {
  const user = await User.findOne({ email, password });
  if (!user) throw new Error('Invalid credentials');
  return jwt.sign({ id: user.id }, 'secret', { expiresIn: '1h' });
};