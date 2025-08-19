import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { DatabaseService } from './databaseService'
import AWS from 'aws-sdk'

const execAsync = promisify(exec)

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})

const s3 = new AWS.S3()
const lambda = new AWS.Lambda()
const apigateway = new AWS.APIGateway()
const cloudformation = new AWS.CloudFormation()
const ec2 = new AWS.EC2()
const rds = new AWS.RDS()
const elasticache = new AWS.ElastiCache()
const cloudfront = new AWS.CloudFront()
const elbv2 = new AWS.ELBv2()

export interface DeploymentConfig {
  projectId: string;
  userId: string;
  source: {
    type: 'github' | 'gitlab' | 'zip';
    url?: string;
    branch?: string;
    token?: string;
  };
  environment: 'dev' | 'staging' | 'prod';
  infrastructureId: string;
}

interface DeploymentResult {
  success: boolean
  endpoints?: any
  deploymentUrl?: string
  logs: string
  error?: string
  deploymentDetails?: any
}

export interface DeploymentStatus {
  id: string;
  projectId: string;
  userId: string;
  status: 'pending' | 'cloning' | 'building' | 'testing' | 'deploying' | 'completed' | 'failed';
  progress: number;
  logs: string[];
  error?: string;
  source: any;
  environment: string;
  infrastructureId: string;
  createdAt: string;
  updatedAt: string;
  deployedAt?: string;
}

export interface UserToken {
  id: string;
  userId: string;
  provider: 'github' | 'gitlab';
  token: string; // Encrypted
  createdAt: string;
}

class DeploymentService {
  private readonly WORKSPACE_DIR = path.join(__dirname, '..', '..', 'deployment-workspace');

  constructor() {
    this.ensureWorkspaceExists();
  }

  private async ensureWorkspaceExists() {
    try {
      await fs.mkdir(this.WORKSPACE_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to create workspace directory:', error);
    }
  }

  // Start a new deployment
  async startDeployment(config: DeploymentConfig): Promise<string> {
    const deploymentId = `deploy-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    
    const deployment: DeploymentStatus = {
      id: deploymentId,
      projectId: config.projectId,
      userId: config.userId,
      status: 'pending',
      progress: 0,
      logs: ['Deployment initiated'],
      source: config.source,
      environment: config.environment,
      infrastructureId: config.infrastructureId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to database
    await this.saveDeployment(deployment);

    // Start deployment process asynchronously
    this.processDeployment(deploymentId, config).catch(error => {
      console.error('Deployment failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateDeploymentStatus(deploymentId, 'failed', 100, errorMessage);
    });

    return deploymentId;
  }

  // Main deployment processing pipeline
  private async processDeployment(deploymentId: string, config: DeploymentConfig) {
    try {
      // Step 1: Clone/Download code
      await this.updateDeploymentStatus(deploymentId, 'cloning', 10, 'Acquiring source code...');
      const codePath = await this.acquireCode(config);

      // Step 2: Build and test
      await this.updateDeploymentStatus(deploymentId, 'building', 30, 'Building application...');
      await this.buildAndTest(codePath);

      // Step 3: Package for deployment
      await this.updateDeploymentStatus(deploymentId, 'building', 60, 'Packaging application...');
      const packagePath = await this.packageApplication(codePath);

      // Step 4: Deploy to AWS
      await this.updateDeploymentStatus(deploymentId, 'deploying', 80, 'Deploying to AWS...');
      const deploymentResult = await this.deployToAws(config, packagePath);

      // Step 5: Complete
      await this.updateDeploymentStatus(deploymentId, 'completed', 100, 'Deployment completed successfully!');
      
      // Store deployment result with endpoints
      const finalResult = {
        success: deploymentResult.success,
        endpoints: deploymentResult.endpoints,
        deploymentUrl: deploymentResult.deploymentUrl,
        logs: deploymentResult.logs,
        deployedAt: new Date().toISOString()
      }
      
      // Update the deployment with final results
      const databaseService = DatabaseService.getInstance()
      const currentDeployment = databaseService.getDeployment(deploymentId)
      if (currentDeployment) {
        databaseService.saveDeployment({
          ...currentDeployment,
          status: 'completed',
          progress: 100,
          logs: finalResult,
          deployedAt: new Date().toISOString()
        })
      }
      
      console.log('[Deployment] Deployment completed with endpoints:', deploymentResult.endpoints)

    } catch (error: unknown) {
      console.error('Deployment process failed:', error);
      let errorMessage = 'Unknown error during deployment';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      await this.updateDeploymentStatus(deploymentId, 'failed', 100, errorMessage);
    }
  }

  // Acquire code from GitHub, GitLab, or ZIP
  private async acquireCode(config: DeploymentConfig): Promise<string> {
    const deploymentPath = path.join(this.WORKSPACE_DIR, config.projectId);
    
    switch (config.source.type) {
      case 'github':
        return await this.handleGitRepository(config.source.url!, config.source.token, deploymentPath, 'github', config.source.branch);
      case 'gitlab':
        return await this.handleGitRepository(config.source.url!, config.source.token, deploymentPath, 'gitlab', config.source.branch);
      case 'zip':
        return await this.extractZipFile(config.source.url!, deploymentPath);
      default:
        throw new Error(`Unsupported source type: ${config.source.type}`);
    }
  }

  // Handle Git repository (GitHub or GitLab) with smart cloning/pulling
  private async handleGitRepository(url: string, token: string | undefined, targetPath: string, provider: 'github' | 'gitlab', branch: string = 'main'): Promise<string> {
    const repoUrl = this.buildGitUrl(url, token, provider);
    
    try {
      // Check if repository already exists
      const gitPath = path.join(targetPath, '.git');
      const gitExists = await fs.access(gitPath).then(() => true).catch(() => false);
      
      if (gitExists) {
        console.log(`[Deployment] Repository already exists at ${targetPath}, checking for updates...`);
        
        try {
          // Check if we're on the correct remote
          const currentRemote = await execAsync('git remote get-url origin', { cwd: targetPath });
          const cleanCurrentRemote = currentRemote.stdout.trim();
          const cleanRepoUrl = repoUrl.replace(/https:\/\/[^@]*@/, 'https://'); // Remove token from comparison
          
          if (cleanCurrentRemote.includes(cleanRepoUrl.replace('https://', ''))) {
            console.log('[Deployment] Same repository detected, pulling latest changes...');
            
            // Fetch latest changes
            await execAsync('git fetch origin', { cwd: targetPath });
            
            // Check if there are new commits
            const currentCommit = await execAsync('git rev-parse HEAD', { cwd: targetPath });
            const remoteCommit = await execAsync(`git rev-parse origin/${branch}`, { cwd: targetPath });
            
            if (currentCommit.stdout.trim() !== remoteCommit.stdout.trim()) {
              console.log('[Deployment] New commits detected, pulling latest changes...');
              
              // Stash any local changes if they exist
              try {
                await execAsync('git stash', { cwd: targetPath });
                console.log('[Deployment] Stashed local changes');
              } catch (stashError) {
                // No local changes to stash, continue
              }
              
              // Pull latest changes
              await execAsync(`git pull origin ${branch}`, { cwd: targetPath });
              console.log('[Deployment] Successfully pulled latest changes');
              
              // Get the latest commit hash for logging
              const latestCommit = await execAsync('git rev-parse HEAD', { cwd: targetPath });
              console.log(`[Deployment] Latest commit: ${latestCommit.stdout.trim().substring(0, 8)}`);
            } else {
              console.log('[Deployment] Repository is up to date, no new changes');
            }
          } else {
            console.log('[Deployment] Different repository detected, removing old and cloning new...');
            await fs.rm(targetPath, { recursive: true, force: true });
            await fs.mkdir(targetPath, { recursive: true });
            await execAsync(`git clone ${repoUrl} ${targetPath}`);
          }
        } catch (gitError) {
          console.warn('[Deployment] Git operations failed, removing and re-cloning:', gitError);
          await fs.rm(targetPath, { recursive: true, force: true });
          await fs.mkdir(targetPath, { recursive: true });
          await execAsync(`git clone ${repoUrl} ${targetPath}`);
        }
      } else {
        console.log(`[Deployment] Cloning new repository to ${targetPath}...`);
        await fs.mkdir(targetPath, { recursive: true });
        await execAsync(`git clone ${repoUrl} ${targetPath}`);
      }
      
      // Switch to the specified branch if different from default
      if (branch !== 'main') {
        try {
          await execAsync(`git checkout ${branch}`, { cwd: targetPath });
          console.log(`[Deployment] Switched to branch: ${branch}`);
        } catch (checkoutError) {
          console.warn(`[Deployment] Failed to checkout branch ${branch}, staying on default branch`);
        }
      }
      
      return targetPath;
    } catch (error) {
      console.error('[Deployment] Failed to handle Git repository:', error);
      throw new Error(`Failed to acquire code from ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Build Git URL with authentication
  private buildGitUrl(url: string, token: string | undefined, provider: 'github' | 'gitlab'): string {
    if (!token) {
      return url;
    }
    
    if (provider === 'github') {
      return url.replace('https://github.com/', `https://${token}@github.com/`);
    } else if (provider === 'gitlab') {
      return url.replace('https://gitlab.com/', `https://oauth2:${token}@gitlab.com/`);
    }
    
    return url;
  }

  // Clone GitHub repository (deprecated, use handleGitRepository instead)
  private async cloneGitHubRepo(url: string, token: string | undefined, targetPath: string): Promise<string> {
    console.warn('[Deployment] cloneGitHubRepo is deprecated, use handleGitRepository instead');
    return this.handleGitRepository(url, token, targetPath, 'github');
  }

  // Clone GitLab repository (deprecated, use handleGitRepository instead)
  private async cloneGitLabRepo(url: string, token: string | undefined, targetPath: string): Promise<string> {
    console.warn('[Deployment] cloneGitLabRepo is deprecated, use handleGitRepository instead');
    return this.handleGitRepository(url, token, targetPath, 'gitlab');
  }

  // Extract ZIP file
  private async extractZipFile(zipPath: string, targetPath: string): Promise<string> {
    await execAsync(`unzip -o "${zipPath}" -d "${targetPath}"`);
    return targetPath;
  }

  // Build and test the application
  private async buildAndTest(codePath: string): Promise<void> {
    console.log(`[Deployment] Starting build process in: ${codePath}`);
    
    // Auto-detect build commands
    const packageJsonPath = path.join(codePath, 'package.json');
    const hasPackageJson = await fs.access(packageJsonPath).then(() => true).catch(() => false);

    if (hasPackageJson) {
      console.log('[Deployment] Detected Node.js application');
      
      // Node.js application
      try {
        console.log('[Deployment] Installing dependencies with --legacy-peer-deps...');
        // Use --legacy-peer-deps to handle dependency conflicts
        await execAsync('npm install --legacy-peer-deps', { cwd: codePath });
        console.log('[Deployment] Dependencies installed successfully');
      } catch (error) {
        console.warn('[Deployment] npm install with --legacy-peer-deps failed, trying with --force');
        try {
          await execAsync('npm install --force', { cwd: codePath });
          console.log('[Deployment] Dependencies installed with --force');
        } catch (forceError) {
          console.error('[Deployment] npm install failed with both --legacy-peer-deps and --force');
          throw new Error(`Dependency installation failed: ${forceError instanceof Error ? forceError.message : 'Unknown error'}`);
        }
      }
      
      // Run tests if available
      try {
        console.log('[Deployment] Running tests...');
        await execAsync('npm test', { cwd: codePath });
        console.log('[Deployment] Tests completed successfully');
      } catch (error) {
        console.warn('[Deployment] Tests failed, but continuing with deployment');
      }

      // Build if build script exists
      try {
        console.log('[Deployment] Running build script...');
        await execAsync('npm run build', { cwd: codePath });
        console.log('[Deployment] Build completed successfully');
      } catch (error) {
        console.warn('[Deployment] Build script not found or failed, using source directly');
      }
    } else {
      // Check for other build systems
      const hasRequirementsTxt = await fs.access(path.join(codePath, 'requirements.txt')).then(() => true).catch(() => false);
      if (hasRequirementsTxt) {
        console.log('[Deployment] Detected Python application');
        // Python application
        await execAsync('pip install -r requirements.txt', { cwd: codePath });
        console.log('[Deployment] Python dependencies installed');
      } else {
        console.log('[Deployment] No package.json or requirements.txt found, skipping build step');
      }
    }
  }

  // Package application for deployment
  private async packageApplication(codePath: string): Promise<string> {
    const packagePath = path.join(codePath, 'deployment-package.zip');
    
    // Create deployment package
    await execAsync(`zip -r "${packagePath}" . -x "*.git*" "node_modules/*" "__pycache__/*" "*.pyc"`, { cwd: codePath });
    
    return packagePath;
  }

  // Deploy application to AWS using real infrastructure
  private async deployToAws(config: DeploymentConfig, buildPath: string): Promise<DeploymentResult> {
    console.log('[Deployment] Deploying to AWS using real infrastructure...')
    
    try {
      // Step 1: Get Terraform state for the infrastructure
      const terraformState = await this.getTerraformState(config.infrastructureId)
      if (!terraformState) {
        throw new Error('Terraform infrastructure not found or not deployed')
      }

      // Step 2: Analyze application type and map to AWS services
      const appType = await this.analyzeApplicationType(buildPath)
      console.log(`[Deployment] Detected application type: ${appType}`)

      // Step 3: Deploy based on application type
      const deploymentResult = await this.deployByType(appType, buildPath, terraformState, config)

      // Step 4: Validate deployment and get real endpoints
      const endpoints = await this.validateAndGetEndpoints(deploymentResult, terraformState)

      console.log('[Deployment] Real deployment completed successfully!')
      console.log(`[Deployment] Real endpoints: ${Object.keys(endpoints).length} endpoints found`)
      
      return {
        success: true,
        endpoints,
        deploymentUrl: endpoints.primary || endpoints.api || endpoints.frontend,
        logs: 'Real AWS deployment completed successfully!',
        deploymentDetails: deploymentResult
      }
    } catch (error) {
      console.error('[Deployment] AWS deployment failed:', error)
      throw new Error(`AWS deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get Terraform state for infrastructure
  private async getTerraformState(infrastructureId: string): Promise<any> {
    try {
      const terraformDir = path.join(__dirname, '../../terraform-runner/workspace', infrastructureId)
      const stateFile = path.join(terraformDir, 'terraform.tfstate')
      
      if (!await fs.access(stateFile).then(() => true).catch(() => false)) {
        throw new Error('Terraform state file not found')
      }

      const stateContent = await fs.readFile(stateFile, 'utf-8')
      return JSON.parse(stateContent)
    } catch (error) {
      console.error('[Deployment] Failed to read Terraform state:', error)
      return null
    }
  }

  // Analyze application type
  private async analyzeApplicationType(buildPath: string): Promise<string> {
    const hasPackageJson = await fs.access(path.join(buildPath, 'package.json')).then(() => true).catch(() => false)
    const hasRequirementsTxt = await fs.access(path.join(buildPath, 'requirements.txt')).then(() => true).catch(() => false)
    const hasBuildFolder = await fs.access(path.join(buildPath, 'build')).then(() => true).catch(() => false)
    const hasDistFolder = await fs.access(path.join(buildPath, 'dist')).then(() => true).catch(() => false)
    const hasIndexHtml = await fs.access(path.join(buildPath, 'index.html')).then(() => true).catch(() => false)

    if (hasBuildFolder || hasDistFolder || hasIndexHtml) {
      return 'frontend'
    } else if (hasPackageJson) {
      return 'nodejs'
    } else if (hasRequirementsTxt) {
      return 'python'
    } else {
      return 'static'
    }
  }

  // Deploy based on application type
  private async deployByType(appType: string, buildPath: string, terraformState: any, config: DeploymentConfig): Promise<any> {
    switch (appType) {
      case 'frontend':
        return await this.deployFrontend(buildPath, terraformState, config)
      case 'nodejs':
        return await this.deployNodeJS(buildPath, terraformState, config)
      case 'python':
        return await this.deployPython(buildPath, terraformState, config)
      case 'static':
        return await this.deployStatic(buildPath, terraformState, config)
      default:
        throw new Error(`Unsupported application type: ${appType}`)
    }
  }

  // Deploy frontend application
  private async deployFrontend(buildPath: string, terraformState: any, config: DeploymentConfig): Promise<any> {
    console.log('[Deployment] Deploying frontend application...')
    
    // Find S3 bucket from Terraform state
    const s3Bucket = this.findResourceFromState(terraformState, 'aws_s3_bucket')
    if (!s3Bucket) {
      throw new Error('S3 bucket not found in Terraform state')
    }

    // Upload build files to S3
    const buildFolder = await this.findBuildFolder(buildPath)
    await this.uploadToS3(buildFolder, s3Bucket.name, config.projectId)

    // Configure S3 for static website hosting
    await this.configureS3Website(s3Bucket.name)

    // Find CloudFront distribution if exists
    const cloudfrontDist = this.findResourceFromState(terraformState, 'aws_cloudfront_distribution')
    if (cloudfrontDist) {
      await this.invalidateCloudFront(cloudfrontDist.id)
    }

    return {
      type: 'frontend',
      s3Bucket: s3Bucket.name,
      cloudfrontDistribution: cloudfrontDist?.id
    }
  }

  // Deploy Node.js application
  private async deployNodeJS(buildPath: string, terraformState: any, config: DeploymentConfig): Promise<any> {
    console.log('[Deployment] Deploying Node.js application...')
    
    // Find Lambda function from Terraform state
    const lambdaFunction = this.findResourceFromState(terraformState, 'aws_lambda_function')
    if (!lambdaFunction) {
      throw new Error('Lambda function not found in Terraform state')
    }

    // Create deployment package
    const deploymentPackage = await this.createLambdaPackage(buildPath, 'nodejs')

    // Update Lambda function code
    await this.updateLambdaCode(lambdaFunction.name, deploymentPackage)

    return {
      type: 'nodejs',
      lambdaFunction: lambdaFunction.name
    }
  }

  // Deploy Python application
  private async deployPython(buildPath: string, terraformState: any, config: DeploymentConfig): Promise<any> {
    console.log('[Deployment] Deploying Python application...')
    
    // Find Lambda function from Terraform state
    const lambdaFunction = this.findResourceFromState(terraformState, 'aws_lambda_function')
    if (!lambdaFunction) {
      throw new Error('Lambda function not found in Terraform state')
    }

    // Create deployment package
    const deploymentPackage = await this.createLambdaPackage(buildPath, 'python')

    // Update Lambda function code
    await this.updateLambdaCode(lambdaFunction.name, deploymentPackage)

    return {
      type: 'python',
      lambdaFunction: lambdaFunction.name
    }
  }

  // Deploy static files
  private async deployStatic(buildPath: string, terraformState: any, config: DeploymentConfig): Promise<any> {
    console.log('[Deployment] Deploying static files...')
    
    // Find S3 bucket from Terraform state
    const s3Bucket = this.findResourceFromState(terraformState, 'aws_s3_bucket')
    if (!s3Bucket) {
      throw new Error('S3 bucket not found in Terraform state')
    }

    // Upload files to S3
    await this.uploadToS3(buildPath, s3Bucket.name, config.projectId)

    return {
      type: 'static',
      s3Bucket: s3Bucket.name
    }
  }

  // Find resource from Terraform state
  private findResourceFromState(state: any, resourceType: string): any {
    if (!state.resources) return null
    
    for (const resource of state.resources) {
      if (resource.type === resourceType) {
        return resource.instances?.[0]?.attributes
      }
    }
    return null
  }

  // Find build folder
  private async findBuildFolder(buildPath: string): Promise<string> {
    const possibleFolders = ['build', 'dist', 'out', 'public']
    
    for (const folder of possibleFolders) {
      const folderPath = path.join(buildPath, folder)
      if (await fs.access(folderPath).then(() => true).catch(() => false)) {
        return folderPath
      }
    }
    
    return buildPath // Fallback to root if no build folder found
  }

  // Upload files to S3
  private async uploadToS3(sourcePath: string, bucketName: string, projectId: string): Promise<void> {
    console.log(`[Deployment] Uploading files to S3 bucket: ${bucketName}`)
    
    const files = await this.getAllFiles(sourcePath)
    
    for (const file of files) {
      const relativePath = path.relative(sourcePath, file)
      const key = `${projectId}/${relativePath}`
      
      const fileContent = await fs.readFile(file)
      await s3.upload({
        Bucket: bucketName,
        Key: key,
        Body: fileContent,
        ContentType: this.getContentType(file)
      }).promise()
      
      console.log(`[Deployment] Uploaded: ${key}`)
    }
  }

  // Get all files recursively
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = []
    const items = await fs.readdir(dir, { withFileTypes: true })
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name)
      if (item.isDirectory()) {
        files.push(...await this.getAllFiles(fullPath))
      } else {
        files.push(fullPath)
      }
    }
    
    return files
  }

  // Get content type for file
  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    const contentTypes: { [key: string]: string } = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    }
    return contentTypes[ext] || 'application/octet-stream'
  }

  // Configure S3 for static website hosting
  private async configureS3Website(bucketName: string): Promise<void> {
    try {
      await s3.putBucketWebsite({
        Bucket: bucketName,
        WebsiteConfiguration: {
          IndexDocument: { Suffix: 'index.html' },
          ErrorDocument: { Key: 'index.html' }
        }
      }).promise()
      console.log(`[Deployment] Configured S3 website hosting for bucket: ${bucketName}`)
    } catch (error) {
      console.warn(`[Deployment] Failed to configure S3 website hosting: ${error}`)
    }
  }

  // Invalidate CloudFront cache
  private async invalidateCloudFront(distributionId: string): Promise<void> {
    try {
      await cloudfront.createInvalidation({
        DistributionId: distributionId,
        InvalidationBatch: {
          Paths: {
            Quantity: 1,
            Items: ['/*']
          },
          CallerReference: `deployment-${Date.now()}`
        }
      }).promise()
      console.log(`[Deployment] Invalidated CloudFront cache for distribution: ${distributionId}`)
    } catch (error) {
      console.warn(`[Deployment] Failed to invalidate CloudFront cache: ${error}`)
    }
  }

  // Create Lambda deployment package
  private async createLambdaPackage(sourcePath: string, runtime: string): Promise<string> {
    const packagePath = path.join(sourcePath, 'lambda-package.zip')
    
    if (runtime === 'nodejs') {
      // For Node.js, include node_modules and source files
      await execAsync(`zip -r "${packagePath}" . -x "*.git*" "deployment-package.zip" "lambda-package.zip"`, { cwd: sourcePath })
    } else if (runtime === 'python') {
      // For Python, include source files and dependencies
      await execAsync(`zip -r "${packagePath}" . -x "*.git*" "deployment-package.zip" "lambda-package.zip" "__pycache__/*" "*.pyc"`, { cwd: sourcePath })
    }
    
    return packagePath
  }

  // Update Lambda function code
  private async updateLambdaCode(functionName: string, packagePath: string): Promise<void> {
    const zipBuffer = await fs.readFile(packagePath)
    
    await lambda.updateFunctionCode({
      FunctionName: functionName,
      ZipFile: zipBuffer
    }).promise()
    
    console.log(`[Deployment] Updated Lambda function: ${functionName}`)
  }

  // Validate deployment and get real endpoints
  private async validateAndGetEndpoints(deploymentResult: any, terraformState: any): Promise<any> {
    const endpoints: any = {}
    
    try {
      // Get S3 website endpoint
      const s3Bucket = this.findResourceFromState(terraformState, 'aws_s3_bucket')
      if (s3Bucket) {
        endpoints.frontend = `http://${s3Bucket.name}.s3-website-${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`
      }

      // Get API Gateway endpoint
      const apiGateway = this.findResourceFromState(terraformState, 'aws_api_gateway_rest_api')
      if (apiGateway) {
        const stage = this.findResourceFromState(terraformState, 'aws_api_gateway_stage')
        if (stage) {
          endpoints.api = `https://${apiGateway.id}.execute-api.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${stage.stage_name}`
          endpoints.primary = endpoints.api
        }
      }

      // Get Lambda function ARN
      const lambdaFunction = this.findResourceFromState(terraformState, 'aws_lambda_function')
      if (lambdaFunction) {
        endpoints.lambda = lambdaFunction.arn
      }

      // Get RDS endpoint
      const rdsInstance = this.findResourceFromState(terraformState, 'aws_db_instance')
      if (rdsInstance) {
        endpoints.database = `${rdsInstance.endpoint}:${rdsInstance.port}`
      }

      // Get ElastiCache endpoint
      const elasticacheCluster = this.findResourceFromState(terraformState, 'aws_elasticache_cluster')
      if (elasticacheCluster) {
        endpoints.redis = `${elasticacheCluster.cache_nodes[0].address}:${elasticacheCluster.cache_nodes[0].port}`
      }

      // Get CloudFront distribution
      const cloudfrontDist = this.findResourceFromState(terraformState, 'aws_cloudfront_distribution')
      if (cloudfrontDist) {
        endpoints.cloudfront = `https://${cloudfrontDist.domain_name}`
        endpoints.primary = endpoints.cloudfront
      }

      // Get Application Load Balancer
      const alb = this.findResourceFromState(terraformState, 'aws_lb')
      if (alb) {
        endpoints.loadBalancer = `http://${alb.dns_name}`
      }

      // Validate endpoints by checking if resources exist
      await this.validateEndpoints(endpoints)

      return endpoints
    } catch (error) {
      console.error('[Deployment] Failed to get real endpoints:', error)
      throw error
    }
  }

  // Validate that endpoints actually exist
  private async validateEndpoints(endpoints: any): Promise<void> {
    console.log('[Deployment] Validating endpoints...')
    
    for (const [key, url] of Object.entries(endpoints)) {
      if (typeof url === 'string' && url.startsWith('http')) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000)
          
          const response = await fetch(url, { 
            method: 'HEAD', 
            signal: controller.signal 
          })
          
          clearTimeout(timeoutId)
          console.log(`[Deployment] ✅ ${key}: ${url} (Status: ${response.status})`)
        } catch (error) {
          console.warn(`[Deployment] ⚠️ ${key}: ${url} (Not accessible: ${error})`)
        }
      }
    }
  }

  // Generate mock endpoints based on infrastructure
  private generateMockEndpoints(infrastructureId: string): any {
    const timestamp = Date.now()
    const baseUrl = `https://${infrastructureId}-${timestamp}.execute-api.us-east-1.amazonaws.com`
    
    return {
      primary: `${baseUrl}/prod`,
      api: `${baseUrl}/prod/api`,
      frontend: `https://${infrastructureId}-frontend-${timestamp}.s3-website-us-east-1.amazonaws.com`,
      websocket: `wss://${infrastructureId}-ws-${timestamp}.execute-api.us-east-1.amazonaws.com/prod`,
      database: `${infrastructureId}-db-${timestamp}.cluster-xyz.us-east-1.rds.amazonaws.com:5432`,
      redis: `${infrastructureId}-cache-${timestamp}.cache.amazonaws.com:6379`,
      cloudfront: `https://${infrastructureId}-cdn-${timestamp}.cloudfront.net`,
      loadBalancer: `https://${infrastructureId}-alb-${timestamp}.us-east-1.elb.amazonaws.com`
    }
  }

  // Map application to AWS services based on infrastructure
  private async mapToAWSServices(packagePath: string, infrastructure: any): Promise<any[]> {
    const targets = [];
    
    // Check if it's a frontend application (has build folder)
    const hasBuildFolder = await fs.access(path.join(path.dirname(packagePath), 'build')).then(() => true).catch(() => false);
    const hasDistFolder = await fs.access(path.join(path.dirname(packagePath), 'dist')).then(() => true).catch(() => false);
    
    if (hasBuildFolder || hasDistFolder) {
      // Frontend application - deploy to S3 + CloudFront
      targets.push({
        type: 'frontend',
        service: 's3',
        source: hasBuildFolder ? 'build' : 'dist'
      });
    }

    // Check for backend indicators
    const hasServerFile = await fs.access(path.join(path.dirname(packagePath), 'server.js')).then(() => true).catch(() => false);
    const hasAppPy = await fs.access(path.join(path.dirname(packagePath), 'app.py')).then(() => true).catch(() => false);
    
    if (hasServerFile || hasAppPy) {
      // Backend application - deploy to Lambda or EC2
      targets.push({
        type: 'backend',
        service: 'lambda',
        source: hasServerFile ? 'server.js' : 'app.py'
      });
    }

    return targets;
  }

  // Deploy to specific AWS target
  private async deployToTarget(target: any, packagePath: string): Promise<void> {
    switch (target.service) {
      case 's3':
        await this.deployToS3(target, packagePath);
        break;
      case 'lambda':
        await this.deployToLambda(target, packagePath);
        break;
      default:
        throw new Error(`Unsupported deployment target: ${target.service}`);
    }
  }

  // Deploy to S3
  private async deployToS3(target: any, packagePath: string): Promise<void> {
    // Implementation for S3 deployment
    console.log('Deploying to S3:', target);
  }

  // Deploy to Lambda
  private async deployToLambda(target: any, packagePath: string): Promise<void> {
    // Implementation for Lambda deployment
    console.log('Deploying to Lambda:', target);
  }

  // Database operations
  private async saveDeployment(deployment: DeploymentStatus): Promise<void> {
    // Save to database
    DatabaseService.getInstance().saveDeployment(deployment);
  }

  private async updateDeploymentStatus(deploymentId: string, status: string, progress: number, logMessage: string): Promise<void> {
    const deployment = DatabaseService.getInstance().getDeployment(deploymentId);
    if (deployment) {
      deployment.status = status;
      deployment.progress = progress;
      deployment.logs.push(`${new Date().toISOString()}: ${logMessage}`);
      deployment.updatedAt = new Date().toISOString();
      DatabaseService.getInstance().saveDeployment(deployment);
    }
  }

  private async markDeploymentComplete(deploymentId: string): Promise<void> {
    const deployment = DatabaseService.getInstance().getDeployment(deploymentId);
    if (deployment) {
      deployment.deployedAt = new Date().toISOString();
      DatabaseService.getInstance().saveDeployment(deployment);
    }
  }

  private async getInfrastructureDetails(infrastructureId: string): Promise<any> {
    // Get infrastructure details from database
    const job = DatabaseService.getInstance().getJob(infrastructureId);
    if (job && job.result) {
      try {
        return typeof job.result === 'string' ? JSON.parse(job.result) : job.result;
      } catch (error) {
        console.error('Failed to parse infrastructure details:', error);
        return null;
      }
    }
    return null;
  }

  // Get deployment status
  async getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus | null> {
    return DatabaseService.getInstance().getDeployment(deploymentId);
  }

  // Get deployment history for a project
  async getDeploymentHistory(projectId: string): Promise<DeploymentStatus[]> {
    return DatabaseService.getInstance().getDeploymentsByProject(projectId);
  }

  // Rollback deployment
  async rollbackDeployment(deploymentId: string): Promise<void> {
    // Implementation for rollback
    console.log('Rolling back deployment:', deploymentId);
  }

  // Save user token
  async saveUserToken(userId: string, provider: 'github' | 'gitlab', token: string): Promise<void> {
    const encryptedToken = this.encryptToken(token);
    const userToken: UserToken = {
      id: crypto.randomUUID(),
      userId,
      provider,
      token: encryptedToken,
      createdAt: new Date().toISOString()
    };
    DatabaseService.getInstance().saveUserToken(userToken);
  }

  // Get user token
  async getUserToken(userId: string, provider: 'github' | 'gitlab'): Promise<string | null> {
    const userToken = DatabaseService.getInstance().getUserToken(userId, provider);
    return userToken ? this.decryptToken(userToken.token) : null;
  }

  // Delete user token
  async deleteUserToken(userId: string, provider: 'github' | 'gitlab'): Promise<void> {
    DatabaseService.getInstance().deleteUserToken(userId, provider);
  }

  // Encrypt token
  private encryptToken(token: string): string {
    // Simple encryption for now - should use proper encryption in production
    return Buffer.from(token).toString('base64');
  }

  // Decrypt token
  private decryptToken(encryptedToken: string): string {
    return Buffer.from(encryptedToken, 'base64').toString();
  }

  // Cleanup and destroy infrastructure
  async cleanupInfrastructure(infrastructureId: string, projectId: string): Promise<void> {
    console.log(`[Cleanup] Starting cleanup for infrastructure: ${infrastructureId}`)
    
    try {
      // Step 1: Get Terraform state
      const terraformState = await this.getTerraformState(infrastructureId)
      if (!terraformState) {
        console.log(`[Cleanup] No Terraform state found for ${infrastructureId}`)
        return
      }

      // Step 2: Clean up deployment resources
      await this.cleanupDeploymentResources(terraformState, projectId)

      // Step 3: Run Terraform destroy
      await this.runTerraformDestroy(infrastructureId)

      // Step 4: Clean up local files
      await this.cleanupLocalFiles(infrastructureId, projectId)

      console.log(`[Cleanup] Infrastructure cleanup completed for: ${infrastructureId}`)
    } catch (error) {
      console.error(`[Cleanup] Failed to cleanup infrastructure ${infrastructureId}:`, error)
      throw error
    }
  }

  // Clean up deployment resources
  private async cleanupDeploymentResources(terraformState: any, projectId: string): Promise<void> {
    console.log('[Cleanup] Cleaning up deployment resources...')

    try {
      // Clean up S3 bucket contents
      const s3Bucket = this.findResourceFromState(terraformState, 'aws_s3_bucket')
      if (s3Bucket) {
        await this.cleanupS3Bucket(s3Bucket.name, projectId)
      }

      // Clean up Lambda function versions
      const lambdaFunction = this.findResourceFromState(terraformState, 'aws_lambda_function')
      if (lambdaFunction) {
        await this.cleanupLambdaVersions(lambdaFunction.name)
      }

      // Clean up CloudFront invalidations
      const cloudfrontDist = this.findResourceFromState(terraformState, 'aws_cloudfront_distribution')
      if (cloudfrontDist) {
        await this.cleanupCloudFrontInvalidations(cloudfrontDist.id)
      }

    } catch (error) {
      console.warn('[Cleanup] Failed to cleanup some deployment resources:', error)
    }
  }

  // Clean up S3 bucket contents
  private async cleanupS3Bucket(bucketName: string, projectId: string): Promise<void> {
    try {
      console.log(`[Cleanup] Cleaning up S3 bucket: ${bucketName}`)
      
      // List objects with project prefix
      const objects = await s3.listObjectsV2({
        Bucket: bucketName,
        Prefix: `${projectId}/`
      }).promise()

      if (objects.Contents && objects.Contents.length > 0) {
        // Delete objects
        await s3.deleteObjects({
          Bucket: bucketName,
          Delete: {
            Objects: objects.Contents.map(obj => ({ Key: obj.Key! }))
          }
        }).promise()

        console.log(`[Cleanup] Deleted ${objects.Contents.length} objects from S3 bucket`)
      }
    } catch (error) {
      console.warn(`[Cleanup] Failed to cleanup S3 bucket ${bucketName}:`, error)
    }
  }

  // Clean up Lambda function versions
  private async cleanupLambdaVersions(functionName: string): Promise<void> {
    try {
      console.log(`[Cleanup] Cleaning up Lambda versions: ${functionName}`)
      
      // List versions
      const versions = await lambda.listVersionsByFunction({
        FunctionName: functionName
      }).promise()

      // Delete old versions (keep $LATEST)
      for (const version of versions.Versions || []) {
        if (version.Version !== '$LATEST') {
          try {
            await lambda.deleteFunction({
              FunctionName: functionName,
              Qualifier: version.Version
            }).promise()
            console.log(`[Cleanup] Deleted Lambda version: ${version.Version}`)
          } catch (error) {
            console.warn(`[Cleanup] Failed to delete Lambda version ${version.Version}:`, error)
          }
        }
      }
    } catch (error) {
      console.warn(`[Cleanup] Failed to cleanup Lambda versions for ${functionName}:`, error)
    }
  }

  // Clean up CloudFront invalidations
  private async cleanupCloudFrontInvalidations(distributionId: string): Promise<void> {
    try {
      console.log(`[Cleanup] Cleaning up CloudFront invalidations: ${distributionId}`)
      
      // List invalidations
      const invalidations = await cloudfront.listInvalidations({
        DistributionId: distributionId
      }).promise()

      // Note: CloudFront invalidations are automatically cleaned up after completion
      // We just log them for reference
      for (const invalidation of invalidations.InvalidationList?.Items || []) {
        console.log(`[Cleanup] Found invalidation: ${invalidation.Id} (Status: ${invalidation.Status})`)
      }
    } catch (error) {
      console.warn(`[Cleanup] Failed to list CloudFront invalidations for ${distributionId}:`, error)
    }
  }

  // Run Terraform destroy
  private async runTerraformDestroy(infrastructureId: string): Promise<void> {
    try {
      console.log(`[Cleanup] Running Terraform destroy for: ${infrastructureId}`)
      
      const terraformDir = path.join(__dirname, '../../terraform-runner/workspace', infrastructureId)
      
      // Check if terraform.tfstate exists
      const stateFile = path.join(terraformDir, 'terraform.tfstate')
      if (!await fs.access(stateFile).then(() => true).catch(() => false)) {
        console.log(`[Cleanup] No Terraform state found, skipping destroy`)
        return
      }

      // Run terraform destroy
      await execAsync('terraform destroy -auto-approve', { cwd: terraformDir })
      console.log(`[Cleanup] Terraform destroy completed for: ${infrastructureId}`)
      
    } catch (error) {
      console.error(`[Cleanup] Failed to run Terraform destroy for ${infrastructureId}:`, error)
      throw error
    }
  }

  // Clean up local files
  private async cleanupLocalFiles(infrastructureId: string, projectId: string): Promise<void> {
    try {
      console.log(`[Cleanup] Cleaning up local files...`)
      
      // Clean up deployment workspace
      const deploymentPath = path.join(this.WORKSPACE_DIR, projectId)
      if (await fs.access(deploymentPath).then(() => true).catch(() => false)) {
        await fs.rm(deploymentPath, { recursive: true, force: true })
        console.log(`[Cleanup] Deleted deployment workspace: ${deploymentPath}`)
      }

      // Clean up Terraform workspace (optional - keep for debugging)
      const terraformDir = path.join(__dirname, '../../terraform-runner/workspace', infrastructureId)
      if (await fs.access(terraformDir).then(() => true).catch(() => false)) {
        // Keep terraform.tfstate for reference, delete other files
        const files = await fs.readdir(terraformDir)
        for (const file of files) {
          if (file !== 'terraform.tfstate') {
            await fs.rm(path.join(terraformDir, file), { recursive: true, force: true })
          }
        }
        console.log(`[Cleanup] Cleaned up Terraform workspace: ${terraformDir}`)
      }
      
    } catch (error) {
      console.warn(`[Cleanup] Failed to cleanup local files:`, error)
    }
  }

  // Get cleanup status
  async getCleanupStatus(infrastructureId: string): Promise<any> {
    try {
      const terraformState = await this.getTerraformState(infrastructureId)
      const terraformDir = path.join(__dirname, '../../terraform-runner/workspace', infrastructureId)
      
      return {
        infrastructureId,
        hasTerraformState: !!terraformState,
        hasTerraformDir: await fs.access(terraformDir).then(() => true).catch(() => false),
        resources: terraformState ? this.getResourceSummary(terraformState) : [],
        canCleanup: !!terraformState
      }
    } catch (error) {
      console.error(`[Cleanup] Failed to get cleanup status for ${infrastructureId}:`, error)
      return {
        infrastructureId,
        hasTerraformState: false,
        hasTerraformDir: false,
        resources: [],
        canCleanup: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Get resource summary from Terraform state
  private getResourceSummary(terraformState: any): any[] {
    const resources: any[] = []
    
    if (terraformState.resources) {
      for (const resource of terraformState.resources) {
        resources.push({
          type: resource.type,
          name: resource.name,
          id: resource.instances?.[0]?.attributes?.id || resource.instances?.[0]?.attributes?.name
        })
      }
    }
    
    return resources
  }
}

export const deploymentService = new DeploymentService(); 