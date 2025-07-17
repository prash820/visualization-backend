```typescript
import { DynamoDB } from './DynamoDB';

interface IUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

class User implements IUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(id: string, username: string, email: string, passwordHash: string, createdAt: Date, updatedAt: Date) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.passwordHash = passwordHash;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static async createUser(userData: IUser): Promise<User> {
    const { id, username, email, passwordHash, createdAt, updatedAt } = userData;
    const user = new User(id, username, email, passwordHash, createdAt, updatedAt);
    await DynamoDB.put({
      TableName: process.env.USERS_TABLE_NAME!,
      Item: user
    }).promise();
    return user;
  }

  static async getUserById(userId: string): Promise<User | null> {
    const result = await DynamoDB.get({
      TableName: process.env.USERS_TABLE_NAME!,
      Key: { id: userId }
    }).promise();

    if (!result.Item) {
      return null;
    }

    const { id, username, email, passwordHash, createdAt, updatedAt } = result.Item;
    return new User(id, username, email, passwordHash, new Date(createdAt), new Date(updatedAt));
  }
}

export { User, IUser };
```