import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const DATA_FILE = path.join(__dirname, "../../documentations.json");

export interface Documentation {
  id: string;
  projectId: string;
  prompt: string;
  umlDiagrams: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

async function readAll(): Promise<Documentation[]> {
  try {
    const file = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(file);
  } catch {
    return [];
  }
}

async function writeAll(documentations: Documentation[]): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(documentations, null, 2));
}

export async function createDocumentation(
  projectId: string,
  prompt: string,
  umlDiagrams: any
): Promise<Documentation> {
  const documentations = await readAll();
  const newDocumentation: Documentation = {
    id: uuidv4(),
    projectId,
    prompt,
    umlDiagrams,
    status: 'pending',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  documentations.push(newDocumentation);
  await writeAll(documentations);
  return newDocumentation;
}

export async function getDocumentationById(id: string): Promise<Documentation | null> {
  const documentations = await readAll();
  return documentations.find(doc => doc.id === id) || null;
}

export async function updateDocumentation(
  id: string,
  updates: Partial<Documentation>
): Promise<Documentation | null> {
  const documentations = await readAll();
  const index = documentations.findIndex(doc => doc.id === id);
  
  if (index === -1) return null;
  
  const updatedDoc = {
    ...documentations[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  documentations[index] = updatedDoc;
  await writeAll(documentations);
  return updatedDoc;
}

export async function getDocumentationsByProjectId(projectId: string): Promise<Documentation[]> {
  const documentations = await readAll();
  return documentations.filter(doc => doc.projectId === projectId);
}

export async function deleteDocumentation(id: string): Promise<boolean> {
  const documentations = await readAll();
  const filteredDocs = documentations.filter(doc => doc.id !== id);
  
  if (filteredDocs.length === documentations.length) {
    return false;
  }
  
  await writeAll(filteredDocs);
  return true;
} 