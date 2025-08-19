import fs from 'fs/promises';
import path from 'path';

/**
 * Clean up duplicate files without extensions
 * Removes files that have no extension when a corresponding .ts file exists
 */
export async function cleanupDuplicateFiles(projectPath: string): Promise<void> {
  try {
    console.log(`[FileUtils] Cleaning up duplicate files in ${projectPath}`);
    
    const backendPath = path.join(projectPath, 'backend', 'src');
    const frontendPath = path.join(projectPath, 'frontend', 'src');
    
    // Clean backend files
    if (await fs.access(backendPath).then(() => true).catch(() => false)) {
      await cleanupDirectory(backendPath);
    }
    
    // Clean frontend files
    if (await fs.access(frontendPath).then(() => true).catch(() => false)) {
      await cleanupDirectory(frontendPath);
    }
    
    console.log(`[FileUtils] ✅ Cleanup completed for ${projectPath}`);
  } catch (error) {
    console.error(`[FileUtils] Error during cleanup:`, error);
  }
}

/**
 * Clean up duplicate files in a directory recursively
 */
async function cleanupDirectory(dirPath: string): Promise<void> {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        // Recursively clean subdirectories
        await cleanupDirectory(itemPath);
      } else if (item.isFile()) {
        // Check if this file has no extension
        if (!item.name.includes('.')) {
          // Look for corresponding .ts file
          const tsFilePath = itemPath + '.ts';
          const tsxFilePath = itemPath + '.tsx';
          
          try {
            const tsExists = await fs.access(tsFilePath).then(() => true).catch(() => false);
            const tsxExists = await fs.access(tsxFilePath).then(() => true).catch(() => false);
            
            if (tsExists || tsxExists) {
              // Remove the file without extension
              await fs.unlink(itemPath);
              console.log(`[FileUtils] 🗑️ Removed duplicate file without extension: ${itemPath}`);
            }
          } catch (error) {
            console.warn(`[FileUtils] Could not check for duplicate: ${itemPath}`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error(`[FileUtils] Error cleaning directory ${dirPath}:`, error);
  }
}

/**
 * Save a file to disk with proper directory creation and extension handling
 */
export async function saveFileToDisk(filePath: string, content: string): Promise<void> {
  try {
    // CRITICAL FIX: Ensure file has proper extension to prevent duplicates
    let finalPath = filePath;
    const fileName = path.basename(filePath);
    const dirName = path.dirname(filePath);
    
    // Check if file has no extension and add appropriate one
    if (!fileName.includes('.')) {
      let extension = '.ts'; // Default to .ts
      
      // Determine extension based on file type and content
      if (filePath.includes('/frontend/') || filePath.includes('frontend/')) {
        // Check if it's a React component (contains JSX)
        if (content.includes('React') || content.includes('jsx') || content.includes('tsx') || 
            content.includes('useState') || content.includes('useEffect') || content.includes('return (')) {
          extension = '.tsx';
        } else {
          extension = '.ts';
        }
      } else if (filePath.includes('/backend/') || filePath.includes('backend/')) {
        // Backend files should always be .ts
        extension = '.ts';
      } else {
        // Default to .ts for unknown paths
        extension = '.ts';
      }
      
      // Add extension to filename
      const newFileName = fileName + extension;
      finalPath = path.join(dirName, newFileName);
      console.log(`[FileUtils] Added extension to file: ${fileName} -> ${newFileName}`);
    }
    
    // Ensure the directory exists
    const dir = path.dirname(finalPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write the file
    await fs.writeFile(finalPath, content, 'utf-8');
    console.log(`[FileUtils] Saved file: ${finalPath}`);
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