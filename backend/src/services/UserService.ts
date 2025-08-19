import { DatabaseService } from '../services/DatabaseService';

import { User } from '../models/User';
import { CreateUserDTO } from '../dto/CreateUserDTO';

export class UserService {
  async createUser(data: CreateUserDTO): Promise<User> {
    // Missing import for DatabaseService
    const db = new DatabaseService();
    const user = await db.create('users', data);
    return user;
  }

  async findUserById(id: string): Promise<User | null> {
    const user = await User.findById(id);
    return user;
  }
}
        