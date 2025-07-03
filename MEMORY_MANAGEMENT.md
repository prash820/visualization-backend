# Memory Management System

## Overview

This system implements comprehensive memory management to prevent R14 memory quota exceeded errors on Heroku. It automatically cleans up job stores, monitors memory usage, and provides emergency cleanup mechanisms.

## Features

### 1. Automatic Job Cleanup
- **Diagram Jobs**: Cleaned after 20 minutes, max 50 jobs
- **IaC Jobs**: Cleaned after 30 minutes, max 50 jobs  
- **Infrastructure Jobs**: Cleaned after 45 minutes, max 30 jobs
- **Application Jobs**: Cleaned after 30 minutes, max 30 jobs
- **Concept Jobs**: Cleaned after 40 minutes, max 25 jobs
- **App Creation Jobs**: Cleaned after 60 minutes, max 20 jobs

### 2. Memory Monitoring
- Continuous monitoring every 2 minutes
- Automatic emergency cleanup when memory exceeds 500MB
- Detailed logging of memory usage patterns
- Health endpoint with memory statistics

### 3. Job Access Tracking
- Jobs are "touched" when accessed, updating their access time
- LRU (Least Recently Used) cleanup prioritizes unused jobs
- Active jobs are preserved regardless of age

## Memory Optimization Techniques

### 1. Job Store Management
```typescript
// Jobs are automatically cleaned up based on age and access patterns
memoryManager.setupJobStoreCleanup(jobStore, "storeName", maxAge, maxJobs);
```

### 2. Large Object Cleanup
```typescript
// Large AI responses are cleared when jobs are cleaned up
if (job.result) {
  delete job.result;
}
delete jobStore[id];
```

### 3. Garbage Collection
- Forced garbage collection in production every 5 minutes
- Emergency garbage collection when memory is high
- Optimized Node.js memory settings

## Monitoring Tools

### 1. Memory Monitoring Script
```bash
# Single health check
node monitor-memory.js health

# Continuous monitoring
node monitor-memory.js monitor

# Memory stress test
node monitor-memory.js stress
```

### 2. Health Endpoints
```bash
# Basic health check with memory stats
curl https://your-app.herokuapp.com/health

# Detailed memory information
curl https://your-app.herokuapp.com/memory
```

### 3. Heroku Monitoring
```bash
# Watch for memory warnings
heroku logs --tail | grep -E "(Memory|R14|quota|exceeded)"

# Check memory usage
heroku run node monitor-memory.js health

# Get detailed logs
heroku logs --tail
```

## Memory Thresholds

### Warning Levels
- **400MB RSS**: Warning logged
- **300MB Heap**: Warning logged
- **500MB RSS**: Emergency cleanup triggered
- **600MB RSS**: Critical threshold approaching Heroku limit

### Cleanup Triggers
1. **Time-based**: Jobs older than specified age
2. **Count-based**: When job count exceeds maximum
3. **Access-based**: Least recently used jobs cleaned first
4. **Emergency**: High memory usage triggers immediate cleanup

## Configuration

### Environment Variables
```bash
# Memory optimization for production
NODE_OPTIONS="--max-old-space-size=512 --optimize-for-size"

# Job retention settings (optional)
JOB_RETENTION_MINUTES=30
MAX_JOBS_PER_STORE=50
```

### Memory Limits
- **Heroku**: 512MB RAM limit
- **Node.js**: 512MB heap size configured
- **Emergency threshold**: 500MB RSS
- **Warning threshold**: 400MB RSS

## Debugging Memory Issues

### 1. Check Current Memory Usage
```bash
# Real-time memory monitoring
heroku logs --tail | grep Memory

# Single check
heroku run node monitor-memory.js health
```

### 2. Identify Memory Leaks
```bash
# Run stress test to identify issues
node monitor-memory.js stress

# Monitor for 10 minutes
node monitor-memory.js monitor
```

### 3. Job Store Analysis
```bash
# Check job store sizes in logs
heroku logs --tail | grep "Cleaned.*jobs"

# Manual cleanup trigger
heroku run node -e "
const { memoryManager } = require('./src/utils/memoryManager');
memoryManager.emergencyCleanup();
"
```

## Troubleshooting

### R14 Memory Quota Exceeded
If you still see R14 errors:

1. **Check cleanup intervals**: Verify job stores are being cleaned
2. **Monitor memory growth**: Look for memory leaks in new code
3. **Reduce job limits**: Lower maxJobs settings if needed
4. **Emergency cleanup**: Trigger manual cleanup

### High Memory Usage
If memory usage is consistently high:

1. **Check job accumulation**: Look for jobs not being cleaned
2. **AI response size**: Large AI responses can consume memory
3. **Concurrent operations**: Too many simultaneous jobs
4. **File system usage**: Large files being held in memory

### Memory Monitoring Gaps
If monitoring isn't working:

1. **Check memory manager initialization**: Verify it's started
2. **Endpoint availability**: Test /health and /memory endpoints
3. **Log output**: Check for memory manager logs
4. **Interval timing**: Verify cleanup intervals are running

## Best Practices

### 1. Job Management
- Keep job results minimal
- Clean up large objects when jobs complete
- Use appropriate retention times for different job types

### 2. Memory Monitoring
- Monitor memory usage patterns
- Set up alerts for high memory usage
- Regular health checks in production

### 3. Development
- Test with memory stress test before deploying
- Monitor memory during development
- Use memory profiling tools when needed

## Memory Manager API

### Setup
```typescript
import { memoryManager } from './utils/memoryManager';

// Set up job store cleanup
memoryManager.setupJobStoreCleanup(jobStore, "storeName", maxAge, maxJobs);

// Set up monitoring
memoryManager.setupMemoryMonitoring();
```

### Usage
```typescript
// Track job access
memoryManager.touchJob(job);

// Get memory stats
const stats = memoryManager.getMemoryStats();

// Check if memory is high
const isHigh = memoryManager.isMemoryHigh(500); // 500MB threshold

// Emergency cleanup
memoryManager.emergencyCleanup();
```

## Integration with Existing Code

All controllers have been updated to use memory management:

- **OpenAI Controller**: Diagram and IaC jobs with cleanup
- **Deploy Controller**: Infrastructure and application jobs
- **Magic Controller**: Concept and app creation jobs
- **Server**: Memory monitoring and graceful shutdown

The system is backward compatible and doesn't break existing functionality. 