import fs from 'fs/promises';
import path from 'path';

/**
 * Save a file to disk with proper directory creation
 */
export async function saveFileToDisk(filePath: string, content: string): Promise<void> {
  try {
    // Ensure the directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write the file
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`[FileUtils] Saved file: ${filePath}`);
  } catch (error) {
    console.error(`[FileUtils] Error saving file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Read a file from disk
 */
export async function readFileFromDisk(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    console.log(`[FileUtils] Read file: ${filePath}`);
    return content;
  } catch (error) {
    console.error(`[FileUtils] Error reading file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a directory if it doesn't exist
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`[FileUtils] Created directory: ${dirPath}`);
  } catch (error) {
    console.error(`[FileUtils] Error creating directory ${dirPath}:`, error);
    throw error;
  }
} 