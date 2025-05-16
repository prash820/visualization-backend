import fs from "fs/promises";
import path from "path";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

const DATA_FILE = path.join(__dirname, "../../users.json");

export interface User {
  _id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

async function readAll(): Promise<User[]> {
  try {
    const file = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(file);
  } catch {
    return [];
  }
}

async function writeAll(users: User[]) {
  await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2), "utf-8");
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const users = await readAll();
  return users.find(u => u.email === email);
}

export async function createUser(email: string, password: string): Promise<User> {
  const users = await readAll();
  if (users.find(u => u.email === email)) {
    throw new Error("User already exists");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user: User = {
    _id: uuidv4(),
    email,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeAll(users);
  return user;
}

export async function validateUser(email: string, password: string): Promise<User | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
} 