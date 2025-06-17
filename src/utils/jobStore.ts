import fs from 'fs';
import path from 'path';

// Export the Job interface
export interface Job {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
  projectId?: string;
  prompt?: string;
  umlDiagrams?: Record<string, string>;
  documentation?: string;
  result?: any;
  error?: string;
  rawResponse?: string;
}

const JOBS_DIR = path.join(process.cwd(), 'jobs');

// Ensure jobs directory exists
if (!fs.existsSync(JOBS_DIR)) {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
}

export async function saveJob(job: Job): Promise<void> {
  const filePath = path.join(JOBS_DIR, `${job.id}.json`);
  await fs.promises.writeFile(filePath, JSON.stringify(job, null, 2));
}

export async function getJobById(jobId: string): Promise<Job | null> {
  try {
    const filePath = path.join(JOBS_DIR, `${jobId}.json`);
    const data = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function updateJob(jobId: string, updates: Partial<Job>): Promise<void> {
  const job = await getJobById(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }
  
  const updatedJob = { ...job, ...updates };
  await saveJob(updatedJob);
}

export async function deleteJob(jobId: string): Promise<void> {
  try {
    const filePath = path.join(JOBS_DIR, `${jobId}.json`);
    await fs.promises.unlink(filePath);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

export async function listJobs(projectId?: string): Promise<Job[]> {
  const files = await fs.promises.readdir(JOBS_DIR);
  const jobs: Job[] = [];
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      const data = await fs.promises.readFile(path.join(JOBS_DIR, file), 'utf-8');
      const job = JSON.parse(data);
      if (!projectId || job.projectId === projectId) {
        jobs.push(job);
      }
    }
  }
  
  return jobs;
} 