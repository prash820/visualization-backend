// Complete service code with business logic
import { UserModel } from '../models/UserModel';
import bcrypt from 'bcrypt';

export class AuthService {
  static async authenticate(credentials: { username: string; password: string }) {
    const user = await UserModel.findOne({ username: credentials.username });
    if (user && bcrypt.compareSync(credentials.password, user.password)) {
      return user;
    }
    throw new Error('Authentication failed');
  }

  static async registerUser(userData: { username: string; password: string }) {
    const hashedPassword = bcrypt.hashSync(userData.password, 10);
    const newUser = new UserModel({ ...userData, password: hashedPassword });
    return await newUser.save();
  }
}