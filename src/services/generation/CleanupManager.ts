import * as fs from 'fs/promises';
import * as path from 'path';

export class CleanupManager {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  async performCleanup(): Promise<void> {
    console.log('[CleanupManager] Performing comprehensive cleanup...');
    
    try {
      await this.cleanupGeneratedDirectories();
      console.log('[CleanupManager] Cleanup completed successfully');
    } catch (error: any) {
      console.warn('[CleanupManager] Cleanup warning:', error.message);
    }
  }

  private async cleanupGeneratedDirectories(): Promise<void> {
    const directoriesToClean = [
      'backend/src', 'frontend/src', 'shared/src',
      'backend/dist', 'frontend/dist', 'shared/dist'
    ];

    for (const dir of directoriesToClean) {
      const fullPath = path.join(this.projectPath, dir);
      try {
        const stats = await fs.stat(fullPath);
        if (stats.isDirectory()) {
          const files = await fs.readdir(fullPath);
          for (const file of files) {
            const filePath = path.join(fullPath, file);
            const fileStats = await fs.stat(filePath);
            if (fileStats.isFile()) {
              await fs.unlink(filePath);
            } else if (fileStats.isDirectory()) {
              await this.removeDirectoryRecursively(filePath);
            }
          }
        }
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          console.warn(`[CleanupManager] Warning cleaning ${fullPath}:`, error.message);
        }
      }
    }
  }

  private async removeDirectoryRecursively(dirPath: string): Promise<void> {
    try {
      const files = await fs.readdir(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
          await this.removeDirectoryRecursively(filePath);
        } else {
          await fs.unlink(filePath);
        }
      }
      await fs.rmdir(dirPath);
    } catch (error: any) {
      console.warn(`[CleanupManager] Warning removing directory ${dirPath}:`, error.message);
    }
  }
} 