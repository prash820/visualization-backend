// Production-ready logging utility
export const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, meta || '');
  },
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, meta || '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, meta || '');
  },
  debug: (message: string, meta?: any) => {
    console.debug(`[DEBUG] ${new Date().toISOString()}: ${message}`, meta || '');
  },
  http: (message: string, meta?: any) => {
    console.log(`[HTTP] ${new Date().toISOString()}: ${message}`, meta || '');
  }
};

// Request logging middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel]('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id,
    });
  });
  
  next();
};

// Performance logging
export const performanceLogger = (operation: string, startTime: number) => {
  const duration = Date.now() - startTime;
  logger.info(`Performance: ${operation}`, { duration: `${duration}ms` });
};

// Error logging with context
export const logErrorWithContext = (error: any, context: any) => {
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    ...context,
  });
};

// Database query logging
export const logDatabaseQuery = (operation: string, collection: string, duration: number, success: boolean) => {
  const level = success ? 'debug' : 'warn';
  logger[level]('Database query', {
    operation,
    collection,
    duration: `${duration}ms`,
    success,
  });
};

// API call logging
export const logApiCall = (method: string, url: string, statusCode: number, duration: number) => {
  const level = statusCode >= 400 ? 'warn' : 'info';
  logger[level]('API call', {
    method,
    url,
    statusCode,
    duration: `${duration}ms`,
  });
}; 