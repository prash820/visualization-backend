import { User } from '../models/User';
import jwt from 'jsonwebtoken';

export class AuthService {
  static async login(email: string, password: string) {
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');
    // Validate password
    const token = jwt.sign({ userId: user.userId }, 'secret');
    return token;
  }
}