import Database from 'better-sqlite3'
import path from 'path'

export interface Job {
  id: string
  type: 'infrastructure' | 'architecture' | 'automation'
  status: string
  progress: number
  phase: string
  prompt?: string
  result?: string
  error?: string
  projectId?: string
  userId?: string // Add user association
  region?: string // AWS region for the project
  createdAt: string
  updatedAt: string
  lastAccessed: string
}

export interface User {
  id: string
  email: string
  passwordHash: string
  name?: string
  role?: string
  createdAt: string
}

export interface Project {
  id: string
  name: string
  description?: string
  userId: string
  status: 'active' | 'archived' | 'deleted'
  createdAt: string
  updatedAt: string
  lastAccessed: string
  metadata?: string // JSON string for additional project data
}

export class DatabaseService {
  private db: Database.Database
  private static instance: DatabaseService

  private constructor() {
    const dbPath = path.join(__dirname, '../../data/infraai.db')
    this.db = new Database(dbPath)
    this.initTables()
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  private initTables() {
    // Jobs table for infrastructure and architecture jobs
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        phase TEXT,
        prompt TEXT,
        result TEXT,
        error TEXT,
        projectId TEXT,
        userId TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastAccessed TEXT NOT NULL
      )
    `)

    // Add userId column to existing jobs table if it doesn't exist
    try {
      this.db.exec('ALTER TABLE jobs ADD COLUMN userId TEXT')
    } catch (error) {
      // Column already exists, ignore error
    }

    // Add region column to existing jobs table if it doesn't exist
    try {
      this.db.exec('ALTER TABLE jobs ADD COLUMN region TEXT DEFAULT "us-east-1"')
    } catch (error) {
      // Column already exists, ignore error
    }

    // Users table (migrated from file storage)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'user',
        createdAt TEXT NOT NULL
      )
    `)

    // Add new columns to existing users table if they don't exist
    try {
      this.db.exec('ALTER TABLE users ADD COLUMN name TEXT')
    } catch (error) {
      // Column already exists, ignore error
    }
    try {
      this.db.exec('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"')
    } catch (error) {
      // Column already exists, ignore error
    }

    // Job history table for completed jobs
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS job_history (
        id TEXT PRIMARY KEY,
        jobId TEXT NOT NULL,
        type TEXT NOT NULL,
        prompt TEXT,
        result TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (jobId) REFERENCES jobs(id)
      )
    `)

    // Projects table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        userId TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastAccessed TEXT NOT NULL,
        metadata TEXT
      )
    `)

    // Deployments table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS deployments (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        userId TEXT NOT NULL,
        status TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        logs TEXT,
        error TEXT,
        source TEXT,
        environment TEXT NOT NULL,
        infrastructureId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deployedAt TEXT
      )
    `)

    // User tokens table for GitHub/GitLab integration
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_tokens (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        provider TEXT NOT NULL,
        token TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        UNIQUE(userId, provider)
      )
    `)

    console.log('[DatabaseService] Tables initialized')
  }

  // Job Management Methods
  saveJob(job: Job): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO jobs 
      (id, type, status, progress, phase, prompt, result, error, projectId, userId, region, createdAt, updatedAt, lastAccessed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    // Ensure result is a string if it's an object
    let resultString = null;
    if (job.result) {
      if (typeof job.result === 'string') {
        resultString = job.result;
      } else {
        resultString = JSON.stringify(job.result);
      }
    }
    
    stmt.run(
      job.id,
      job.type,
      job.status,
      job.progress,
      job.phase || null,
      job.prompt || null,
      resultString,
      job.error || null,
      job.projectId || null,
      job.userId || null,
      job.region || 'us-east-1',
      job.createdAt,
      job.updatedAt,
      job.lastAccessed
    )
  }

  getJob(id: string): Job | undefined {
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE id = ?')
    const row = stmt.get(id) as any
    
    if (!row) return undefined
    
    return {
      id: row.id,
      type: row.type,
      status: row.status,
      progress: row.progress,
      phase: row.phase,
      prompt: row.prompt,
      result: row.result || null, // Ensure null is returned as null, not object
      error: row.error,
      projectId: row.projectId,
      userId: row.userId,
      region: row.region || 'us-east-1',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastAccessed: row.lastAccessed
    }
  }

  getAllJobs(type?: string): Job[] {
    let stmt: Database.Statement
    let rows: any[]
    
    if (type) {
      stmt = this.db.prepare('SELECT * FROM jobs WHERE type = ? ORDER BY updatedAt DESC')
      rows = stmt.all(type) as any[]
    } else {
      stmt = this.db.prepare('SELECT * FROM jobs ORDER BY updatedAt DESC')
      rows = stmt.all() as any[]
    }
    
    return rows.map(row => {
      return {
        id: row.id,
        type: row.type,
        status: row.status,
        progress: row.progress,
        phase: row.phase,
        prompt: row.prompt,
        result: row.result || null, // Ensure null is returned as null, not object
        error: row.error,
        projectId: row.projectId,
        userId: row.userId,
        region: row.region || 'us-east-1',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        lastAccessed: row.lastAccessed
      }
    })
  }

  getJobsByUserId(userId: string, type?: string): Job[] {
    let stmt: Database.Statement
    let rows: any[]
    
    if (type) {
      stmt = this.db.prepare('SELECT * FROM jobs WHERE userId = ? AND type = ? ORDER BY updatedAt DESC')
      rows = stmt.all(userId, type) as any[]
    } else {
      stmt = this.db.prepare('SELECT * FROM jobs WHERE userId = ? ORDER BY updatedAt DESC')
      rows = stmt.all(userId) as any[]
    }
    
    return rows.map(row => {
      return {
        id: row.id,
        type: row.type,
        status: row.status,
        progress: row.progress,
        phase: row.phase,
        prompt: row.prompt,
        result: row.result || null, // Ensure null is returned as null, not object
        error: row.error,
        projectId: row.projectId,
        userId: row.userId,
        region: row.region || 'us-east-1',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        lastAccessed: row.lastAccessed
      }
    })
  }

  // NEW: Get single project by ID for O(1) lookup
  getProjectById(projectId: string, userId: string): any | null {
    // Get all jobs for this project
    const stmt = this.db.prepare(`
      SELECT * FROM jobs 
      WHERE projectId = ? AND userId = ? AND type = 'infrastructure'
      ORDER BY updatedAt DESC
    `)
    const rows = stmt.all(projectId, userId) as any[]
    
    if (rows.length === 0) return null
    
    // Convert rows to job objects
    const jobs = rows.map(row => {
      return {
        id: row.id,
        type: row.type,
        status: row.status,
        progress: row.progress,
        phase: row.phase,
        prompt: row.prompt,
        result: row.result, // Keep as string, don't parse here
        error: row.error,
        projectId: row.projectId,
        userId: row.userId,
        region: row.region || 'us-east-1',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        lastAccessed: row.lastAccessed
      }
    })
    
    // Get the latest job for project metadata
    const latestJob = jobs[0]
    
    // Find the job with terraform code (prefer the one that generated it)
    const jobWithTerraformCode = jobs.find(job => {
      try {
        const parsed = job.result ? JSON.parse(job.result) : null;
        return parsed && parsed.terraformCode && parsed.terraformCode.length > 0;
      } catch (e) {
        return false;
      }
    }) || jobs.find(job => {
      try {
        const parsed = job.result ? JSON.parse(job.result) : null;
        return parsed && parsed.umlDiagrams;
      } catch (e) {
        return false;
      }
    }) || latestJob
    
    // Find detailed generation job that might contain architecture diagram
    const detailedGenerationJob = jobs.find(job => {
      try {
        const parsed = job.result ? JSON.parse(job.result) : null;
        return parsed && parsed.selectedTier && parsed.selectedTier.architectureDiagram;
      } catch (e) {
        return false;
      }
    })
    
    // Find infrastructure tiers job
    const tiersJob = jobs.find(job => {
      try {
        const parsed = job.result ? JSON.parse(job.result) : null;
        return parsed && parsed.infrastructureTiers;
      } catch (e) {
        return false;
      }
    })
    
    // Find selected tier job
    const selectedTierJob = jobs.find(job => {
      try {
        const parsed = job.result ? JSON.parse(job.result) : null;
        return parsed && parsed.selectedTier;
      } catch (e) {
        return false;
      }
    })
    
    const result = jobWithTerraformCode.result ? JSON.parse(jobWithTerraformCode.result) : null;
    const detailedResult = detailedGenerationJob?.result ? JSON.parse(detailedGenerationJob.result) : null;
    const tiersResult = tiersJob?.result ? JSON.parse(tiersJob.result) : null;
    const selectedTierResult = selectedTierJob?.result ? JSON.parse(selectedTierJob.result) : null;
    
    // Build project structure to match frontend expectations
    return {
      projectId,
      jobs,
      latestJob,
      status: latestJob.status,
      createdAt: latestJob.createdAt,
      updatedAt: latestJob.updatedAt,
      terraformCode: result?.terraformCode || null,
      umlDiagrams: result?.umlDiagrams || (detailedResult?.selectedTier?.architectureDiagram ? {
        architecture: detailedResult.selectedTier.architectureDiagram
      } : null),
      deploymentStatus: result?.deploymentStatus || null,
      prompt: jobWithTerraformCode.prompt,
      infrastructureTiers: tiersResult?.infrastructureTiers || null,
      selectedTier: selectedTierResult?.selectedTier || null
    }
  }

  deleteJob(id: string): void {
    const stmt = this.db.prepare('DELETE FROM jobs WHERE id = ?')
    stmt.run(id)
  }

  cleanupOldJobs(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - maxAge).toISOString()
    const stmt = this.db.prepare('DELETE FROM jobs WHERE updatedAt < ?')
    stmt.run(cutoff)
  }

  // User Management Methods
  saveUser(user: User): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO users (id, email, passwordHash, name, role, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      user.id, 
      user.email, 
      user.passwordHash, 
      user.name || null,
      user.role || 'user',
      user.createdAt
    )
  }

  getUserByEmail(email: string): User | undefined {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?')
    const row = stmt.get(email) as any
    
    if (!row) return undefined
    
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      name: row.name,
      role: row.role,
      createdAt: row.createdAt
    }
  }

  getAllUsers(): User[] {
    const stmt = this.db.prepare('SELECT * FROM users')
    const rows = stmt.all() as any[]
    
    return rows.map(row => ({
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      name: row.name,
      role: row.role,
      createdAt: row.createdAt
    }))
  }

  // Project Management Methods
  saveProject(project: Project): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO projects 
      (id, name, description, userId, status, createdAt, updatedAt, lastAccessed, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      project.id,
      project.name,
      project.description,
      project.userId,
      project.status,
      project.createdAt,
      project.updatedAt,
      project.lastAccessed,
      project.metadata
    )
  }

  getProject(id: string): Project | undefined {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?')
    const row = stmt.get(id) as any
    
    if (!row) return undefined
    
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      userId: row.userId,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastAccessed: row.lastAccessed,
      metadata: row.metadata
    }
  }

  getProjectsByUserId(userId: string): Project[] {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE userId = ? ORDER BY updatedAt DESC')
    const rows = stmt.all(userId) as any[]
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      userId: row.userId,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastAccessed: row.lastAccessed,
      metadata: row.metadata
    }))
  }

  deleteProject(id: string): void {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?')
    stmt.run(id)
  }

  updateProjectStatus(id: string, status: string): void {
    const stmt = this.db.prepare('UPDATE projects SET status = ?, updatedAt = ? WHERE id = ?')
    stmt.run(status, new Date().toISOString(), id)
  }

  // Migration from file storage
  async migrateFromFileStorage(): Promise<void> {
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      
      // Read users directly from the JSON file
      const dataFile = path.join(__dirname, '../../users.json')
      const fileContent = await fs.readFile(dataFile, 'utf-8')
      const users = JSON.parse(fileContent)
      
      for (const user of users) {
        this.saveUser({
          id: user._id,
          email: user.email,
          passwordHash: user.passwordHash,
          createdAt: user.createdAt
        })
      }
      
      console.log(`[DatabaseService] Migrated ${users.length} users from file storage`)
    } catch (error) {
      console.log('[DatabaseService] No file storage to migrate from, or migration failed:', error)
    }
  }

  // Utility methods
  getStats(): { totalJobs: number; totalUsers: number; totalProjects: number; jobTypes: Record<string, number> } {
    const jobCount = this.db.prepare('SELECT COUNT(*) as count FROM jobs').get() as any
    const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as any
    const projectCount = this.db.prepare('SELECT COUNT(*) as count FROM projects').get() as any
    const jobTypes = this.db.prepare('SELECT type, COUNT(*) as count FROM jobs GROUP BY type').all() as any[]
    
    const jobTypeStats: Record<string, number> = {}
    jobTypes.forEach(row => {
      jobTypeStats[row.type] = row.count
    })
    
    return {
      totalJobs: jobCount.count,
      totalUsers: userCount.count,
      totalProjects: projectCount.count,
      jobTypes: jobTypeStats
    }
  }

  // Deployment Management Methods
  saveDeployment(deployment: any): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO deployments 
      (id, projectId, userId, status, progress, logs, error, source, environment, infrastructureId, createdAt, updatedAt, deployedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      deployment.id,
      deployment.projectId,
      deployment.userId,
      deployment.status,
      deployment.progress,
      JSON.stringify(deployment.logs),
      deployment.error || null,
      JSON.stringify(deployment.source),
      deployment.environment,
      deployment.infrastructureId,
      deployment.createdAt,
      deployment.updatedAt,
      deployment.deployedAt || null
    )
  }

  getDeployment(id: string): any {
    const stmt = this.db.prepare('SELECT * FROM deployments WHERE id = ?')
    const row = stmt.get(id) as any
    
    if (!row) return undefined
    
    return {
      id: row.id,
      projectId: row.projectId,
      userId: row.userId,
      status: row.status,
      progress: row.progress,
      logs: JSON.parse(row.logs || '[]'),
      error: row.error,
      source: JSON.parse(row.source || '{}'),
      environment: row.environment,
      infrastructureId: row.infrastructureId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deployedAt: row.deployedAt
    }
  }

  getDeploymentsByProject(projectId: string): any[] {
    const stmt = this.db.prepare('SELECT * FROM deployments WHERE projectId = ? ORDER BY createdAt DESC')
    const rows = stmt.all(projectId) as any[]
    
    return rows.map(row => ({
      id: row.id,
      projectId: row.projectId,
      userId: row.userId,
      status: row.status,
      progress: row.progress,
      logs: JSON.parse(row.logs || '[]'),
      error: row.error,
      source: JSON.parse(row.source || '{}'),
      environment: row.environment,
      infrastructureId: row.infrastructureId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deployedAt: row.deployedAt
    }))
  }

  // User Token Management Methods
  saveUserToken(userToken: any): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_tokens 
      (id, userId, provider, token, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      userToken.id,
      userToken.userId,
      userToken.provider,
      userToken.token,
      userToken.createdAt
    )
  }

  getUserToken(userId: string, provider: string): any {
    const stmt = this.db.prepare('SELECT * FROM user_tokens WHERE userId = ? AND provider = ?')
    const row = stmt.get(userId, provider) as any
    
    if (!row) return undefined
    
    return {
      id: row.id,
      userId: row.userId,
      provider: row.provider,
      token: row.token,
      createdAt: row.createdAt
    }
  }

  deleteUserToken(userId: string, provider: string): void {
    const stmt = this.db.prepare('DELETE FROM user_tokens WHERE userId = ? AND provider = ?')
    stmt.run(userId, provider)
  }

  // SQLite API methods
  public getAllTables(): string[] {
    try {
      const result = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      return result.map((row: any) => row.name);
    } catch (error) {
      console.error('Error getting all tables:', error);
      return [];
    }
  }

  public getDatabasePath(): string {
    return path.join(__dirname, '../../data/infraai.db');
  }

  public getTableSchema(tableName: string): any[] {
    try {
      const result = this.db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
      return result.map((row: any) => ({
        cid: row.cid,
        name: row.name,
        type: row.type,
        notnull: row.notnull,
        dflt_value: row.dflt_value,
        pk: row.pk
      }));
    } catch (error) {
      console.error('Error getting table schema:', error);
      return [];
    }
  }

  public getTableRowCount(tableName: string): number {
    try {
      const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as any;
      return result.count;
    } catch (error) {
      console.error('Error getting table row count:', error);
      return 0;
    }
  }

  public getTableData(tableName: string, limit: number = 100, offset: number = 0): any {
    try {
      // Limit the maximum number of rows to prevent memory issues
      const safeLimit = Math.min(limit, 1000);
      const columns = this.getTableSchema(tableName).map(col => col.name);
      
      // Use iterator to process rows in chunks to prevent memory overflow
      const stmt = this.db.prepare(`SELECT * FROM ${tableName} LIMIT ? OFFSET ?`);
      const result = stmt.all(safeLimit, offset) as any[];
      
      // Process rows in smaller chunks to manage memory
      const values: any[][] = [];
      for (let i = 0; i < result.length; i++) {
        const row = result[i] as any;
        values.push(Object.values(row));
        
        // Force garbage collection every 100 rows
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }
      
      return {
        columns,
        values,
        success: true
      };
    } catch (error) {
      console.error('Error getting table data:', error);
      return {
        columns: [],
        values: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public executeQuery(sql: string, params: any[] = []): any {
    try {
      const sqlLower = sql.toLowerCase().trim();
      const isSelect = sqlLower.startsWith('select');
      
      if (isSelect) {
        // For SELECT statements, use .all() to get data
        // Add LIMIT clause if not present to prevent memory issues
        const safeSql = sqlLower.includes('limit') ? sql : `${sql} LIMIT 1000`;
        
        const result = this.db.prepare(safeSql).all(...params) as any[];
        
        if (result.length === 0) {
          return {
            columns: [],
            values: [],
            success: true
          };
        }

        const firstRow = result[0] as any;
        const columns = Object.keys(firstRow);
        
        // Process rows in chunks to manage memory
        const values: any[][] = [];
        for (let i = 0; i < result.length; i++) {
          const row = result[i] as any;
          values.push(Object.values(row));
          
          // Force garbage collection every 100 rows
          if (i % 100 === 0 && global.gc) {
            global.gc();
          }
        }
        
        return {
          columns,
          values,
          success: true
        };
      } else {
        // For INSERT, UPDATE, DELETE statements, use .run() to execute
        const result = this.db.prepare(sql).run(...params);
        
        return {
          columns: [],
          values: [],
          success: true,
          rowsAffected: result.changes,
          lastInsertRowid: result.lastInsertRowid
        };
      }
    } catch (error) {
      console.error('Error executing query:', error);
      return {
        columns: [],
        values: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  close(): void {
    this.db.close()
  }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance() 