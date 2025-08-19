// UserService.ts

import { User, AppError, UserRole } from './types';
import { createAppError, ERROR_CODES } from './constants';
import { findUserById, isUserRole, handleAppError } from './utils';

export class UserService {
  private users: User[];

  constructor(users: User[]) {
    this.users = users;
  }

  public getUserById(userId: string): User | null {
    try {
      const user = findUserById(this.users, userId);
      if (!user) {
        throw createAppError('User not found', ERROR_CODES.NOT_FOUND);
      }
      return user;
    } catch (error) {
      handleAppError(error as AppError);
      return null;
    }
  }

  public getUsersByRole(role: UserRole): User[] {
    return this.users.filter(user => isUserRole(user, role));
  }

  public addUser(newUser: User): void {
    if (this.users.some(user => user.id === newUser.id)) {
      handleAppError(createAppError('User already exists', ERROR_CODES.GENERIC_ERROR));
      return;
    }
    this.users.push(newUser);
  }

  public updateUser(userId: string, updatedInfo: Partial<User>): void {
    try {
      const userIndex = this.users.findIndex(user => user.id === userId);
      if (userIndex === -1) {
        throw createAppError('User not found', ERROR_CODES.NOT_FOUND);
      }
      this.users[userIndex] = { ...this.users[userIndex], ...updatedInfo };
    } catch (error) {
      handleAppError(error as AppError);
    }
  }

  public deleteUser(userId: string): void {
    try {
      const userIndex = this.users.findIndex(user => user.id === userId);
      if (userIndex === -1) {
        throw createAppError('User not found', ERROR_CODES.NOT_FOUND);
      }
      this.users.splice(userIndex, 1);
    } catch (error) {
      handleAppError(error as AppError);
    }
  }
}

// Example usage
const users: User[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com', role: 'freelancer' },
  { id: '2', name: 'Bob', email: 'bob@example.com', role: 'client' }
];

const userService = new UserService(users);
const user = userService.getUserById('1');
if (user) {
  console.log(`User found: ${user.name}`);
}

userService.addUser({ id: '3', name: 'Charlie', email: 'charlie@example.com', role: 'admin' });
console.log(userService.getUsersByRole('admin'));

userService.updateUser('1', { name: 'Alice Updated' });
console.log(userService.getUserById('1'));

userService.deleteUser('2');
console.log(userService.getUserById('2'));