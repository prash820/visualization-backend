interface MemoryOptimizedJob {
  status: string;
  progress: number;
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  lastAccessed?: Date;
}

class MemoryManager {
  private static instance: MemoryManager;
  private cleanupIntervals: Set<NodeJS.Timeout> = new Set();
  
  private constructor() {}
  
  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Set up automatic cleanup for a job store
   */
  setupJobStoreCleanup<T extends MemoryOptimizedJob>(
    jobStore: Record<string, T>,
    storeName: string,
    maxAge: number = 30 * 60 * 1000, // 30 minutes default
    maxJobs: number = 100 // Maximum number of jobs to keep
  ): void {
    console.log(`[Memory] Setting up cleanup for ${storeName} (maxAge: ${maxAge}ms, maxJobs: ${maxJobs})`);
    
    const cleanupInterval = setInterval(() => {
      const before = Object.keys(jobStore).length;
      const cleaned = this.cleanupJobStore(jobStore, storeName, maxAge, maxJobs);
      
      if (cleaned > 0) {
        const after = Object.keys(jobStore).length;
        console.log(`[Memory] Cleaned ${cleaned} jobs from ${storeName} (${before} -> ${after})`);
      }
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
    
    this.cleanupIntervals.add(cleanupInterval);
  }

  /**
   * Clean up old jobs from a job store
   */
  private cleanupJobStore<T extends MemoryOptimizedJob>(
    jobStore: Record<string, T>,
    storeName: string,
    maxAge: number,
    maxJobs: number
  ): number {
    const now = Date.now();
    const jobIds = Object.keys(jobStore);
    let cleanedCount = 0;

    // Sort jobs by last accessed time (oldest first)
    const sortedJobs = jobIds
      .map(id => ({
        id,
        job: jobStore[id],
        lastAccessed: jobStore[id].lastAccessed?.getTime() || jobStore[id].startTime?.getTime() || 0
      }))
      .sort((a, b) => a.lastAccessed - b.lastAccessed);

    // Remove jobs that are too old or exceed max count
    for (const { id, job, lastAccessed } of sortedJobs) {
      const age = now - lastAccessed;
      const shouldRemoveByAge = age > maxAge;
      const shouldRemoveByCount = sortedJobs.length - cleanedCount > maxJobs;
      
      // Only remove completed or failed jobs, keep active jobs
      const canRemove = job.status === 'completed' || job.status === 'failed';
      
      if (canRemove && (shouldRemoveByAge || shouldRemoveByCount)) {
        // Clear large objects to free memory
        if (job.result) {
          delete job.result;
        }
        delete jobStore[id];
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Update job access time for memory management
   */
  touchJob<T extends MemoryOptimizedJob>(job: T): void {
    job.lastAccessed = new Date();
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      console.log("[Memory] Forced garbage collection");
    }
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): { used: number; rss: number; heapUsed: number; heapTotal: number; external: number } {
    const memUsage = process.memoryUsage();
    return {
      used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
    };
  }

  /**
   * Log current memory usage
   */
  logMemoryUsage(context: string = ""): void {
    const stats = this.getMemoryStats();
    console.log(`[Memory${context ? ' ' + context : ''}] Used: ${stats.used}MB, RSS: ${stats.rss}MB, Heap: ${stats.heapUsed}/${stats.heapTotal}MB`);
  }

  /**
   * Check if memory usage is high
   */
  isMemoryHigh(threshold: number = 500): boolean {
    const stats = this.getMemoryStats();
    return stats.rss > threshold;
  }

  /**
   * Emergency memory cleanup
   */
  emergencyCleanup(): void {
    console.log("[Memory] Running emergency cleanup...");
    this.forceGarbageCollection();
    
    // Additional emergency measures could go here
    // e.g., clearing caches, reducing job store sizes, etc.
  }

  /**
   * Set up memory monitoring
   */
  setupMemoryMonitoring(): void {
    // Log memory usage every 2 minutes
    const monitoringInterval = setInterval(() => {
      this.logMemoryUsage("Monitor");
      
      // If memory is high, run emergency cleanup
      if (this.isMemoryHigh(500)) { // 500MB threshold
        console.log("[Memory] High memory usage detected, running emergency cleanup");
        this.emergencyCleanup();
      }
    }, 2 * 60 * 1000);
    
    this.cleanupIntervals.add(monitoringInterval);
  }

  /**
   * Cleanup all intervals (for shutdown)
   */
  shutdown(): void {
    console.log("[Memory] Shutting down memory manager");
    this.cleanupIntervals.forEach(interval => clearInterval(interval));
    this.cleanupIntervals.clear();
  }
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance();

// Type for jobs that can be managed by MemoryManager
export type { MemoryOptimizedJob }; 