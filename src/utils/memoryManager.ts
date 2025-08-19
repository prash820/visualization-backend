// Memory Manager Utility
// Monitors and manages memory usage to prevent out-of-memory errors

export interface MemoryOptimizedJob {
  status: string;
  progress: number;
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  lastAccessed?: Date;
}

export class MemoryManager {
  private static instance: MemoryManager;
  private memoryThreshold: number = 0.8; // 80% of available memory
  private lastGcTime: number = 0;
  private gcInterval: number = 30000; // 30 seconds
  private cleanupIntervals: Set<NodeJS.Timeout> = new Set();

  private constructor() {
    this.startMemoryMonitoring();
  }

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Get current memory usage statistics
   */
  public getMemoryStats(): {
    used: number;
    total: number;
    percentage: number;
    isHigh: boolean;
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  } {
    const memUsage = process.memoryUsage();
    const used = memUsage.heapUsed;
    const total = memUsage.heapTotal;
    const percentage = used / total;
    const isHigh = percentage > this.memoryThreshold;

    return {
      used: Math.round(used / 1024 / 1024), // MB
      total: Math.round(total / 1024 / 1024), // MB
      percentage: Math.round(percentage * 100),
      isHigh,
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
    };
  }

  /**
   * Check if memory usage is high and trigger garbage collection if needed
   */
  public checkMemoryUsage(): boolean {
    const stats = this.getMemoryStats();
    const now = Date.now();

    if (stats.isHigh && (now - this.lastGcTime) > this.gcInterval) {
      console.log(`[MemoryManager] High memory usage detected: ${stats.percentage}% (${stats.used}MB/${stats.total}MB)`);
      
      if (global.gc) {
        global.gc();
        this.lastGcTime = now;
        console.log('[MemoryManager] Garbage collection triggered');
        
        // Check memory after GC
        const afterStats = this.getMemoryStats();
        console.log(`[MemoryManager] After GC: ${afterStats.percentage}% (${afterStats.used}MB/${afterStats.total}MB)`);
      } else {
        console.warn('[MemoryManager] Garbage collection not available');
      }
      
      return true;
    }

    return false;
  }

  /**
   * Force garbage collection
   */
  public forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      this.lastGcTime = Date.now();
      console.log('[MemoryManager] Forced garbage collection');
    } else {
      console.warn('[MemoryManager] Garbage collection not available');
    }
  }

  /**
   * Set up automatic cleanup for a job store
   */
  public setupJobStoreCleanup<T extends MemoryOptimizedJob>(
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
  public touchJob<T extends MemoryOptimizedJob>(job: T): void {
    job.lastAccessed = new Date();
  }

  /**
   * Log current memory usage
   */
  public logMemoryUsage(context: string = ""): void {
    const stats = this.getMemoryStats();
    console.log(`[Memory${context ? ' ' + context : ''}] Used: ${stats.used}MB, RSS: ${stats.rss}MB, Heap: ${stats.heapUsed}/${stats.heapTotal}MB`);
  }

  /**
   * Check if memory usage is high
   */
  public isMemoryHigh(threshold: number = 500): boolean {
    const stats = this.getMemoryStats();
    return stats.rss > threshold;
  }

  /**
   * Emergency memory cleanup
   */
  public emergencyCleanup(): void {
    console.log("[Memory] Running emergency cleanup...");
    this.forceGarbageCollection();
    
    // Additional emergency measures could go here
    // e.g., clearing caches, reducing job store sizes, etc.
  }

  /**
   * Set up memory monitoring
   */
  public setupMemoryMonitoring(): void {
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
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    // Monitor memory every 10 seconds
    setInterval(() => {
      this.checkMemoryUsage();
    }, 10000);

    console.log('[MemoryManager] Memory monitoring started');
  }

  /**
   * Set memory threshold (0.0 to 1.0)
   */
  public setMemoryThreshold(threshold: number): void {
    if (threshold >= 0 && threshold <= 1) {
      this.memoryThreshold = threshold;
      console.log(`[MemoryManager] Memory threshold set to ${threshold * 100}%`);
    } else {
      console.warn('[MemoryManager] Invalid memory threshold. Must be between 0 and 1');
    }
  }

  /**
   * Get memory usage as formatted string
   */
  public getMemoryUsageString(): string {
    const stats = this.getMemoryStats();
    return `${stats.used}MB/${stats.total}MB (${stats.percentage}%)`;
  }

  /**
   * Cleanup all intervals (for shutdown)
   */
  public shutdown(): void {
    console.log("[Memory] Shutting down memory manager");
    this.cleanupIntervals.forEach(interval => clearInterval(interval));
    this.cleanupIntervals.clear();
  }
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance(); 