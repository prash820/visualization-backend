// src/controllers/aiDrivenCodeController.ts
import { Request, Response } from 'express';
import { enhanceComponentPlanWithAI, enhanceContractsWithAI, generateEnhancedCode } from '../utils/aiDrivenArchitectureGenerator';
import { generateBuildFiles } from '../utils/buildFileGenerator';
import { generateComponentPlan } from '../utils/componentPlanGenerator';
import { generateFunctionSignatureContracts } from '../utils/functionSignatureGenerator';
import { InfrastructureService } from '../services/infrastructureService';
import { InfrastructureContext } from '../types/infrastructure';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Get infrastructure context from Terraform state (copied from appCodeController)
 */
async function getInfrastructureContext(projectId: string): Promise<InfrastructureContext> {
  try {
    console.log(`[Infrastructure] Getting Terraform state for project ${projectId}`);
    
    // Get Terraform state
    const terraformState = await InfrastructureService.getTerraformState(projectId);
    
    if (!terraformState) {
      console.log(`[Infrastructure] No Terraform state found for project ${projectId}, using default context`);
      return getDefaultInfrastructureContext();
    }

    // Get Terraform outputs
    const terraformOutputs = await InfrastructureService.getTerraformOutputs(projectId);
    
    // Extract infrastructure context from state and outputs
    const context: InfrastructureContext = {
      lambdaFunctions: {}
    };
    
    // Extract from Terraform outputs
    if (terraformOutputs) {
      context.databaseUrl = terraformOutputs.database_url || terraformOutputs.rds_endpoint;
      context.databaseName = terraformOutputs.database_name || terraformOutputs.db_name;
      context.databasePort = terraformOutputs.database_port || terraformOutputs.db_port;
      context.databaseType = (terraformOutputs.database_type || 'postgresql') as 'postgresql' | 'mysql' | 'mongodb' | 'dynamodb';
      context.apiGatewayUrl = terraformOutputs.api_gateway_url || terraformOutputs.api_endpoint;
      context.apiGatewayId = terraformOutputs.api_gateway_id;
      context.apiGatewayStage = terraformOutputs.api_gateway_stage || 'prod';
      context.lambdaFunctionUrl = terraformOutputs.lambda_function_url;
      context.s3BucketName = terraformOutputs.s3_bucket_name || terraformOutputs.bucket_name;
      context.s3BucketRegion = terraformOutputs.s3_bucket_region || terraformOutputs.bucket_region;
      context.dynamoDbTableName = terraformOutputs.dynamodb_table_name;
      context.dynamoDbTableArn = terraformOutputs.dynamodb_table_arn;
      context.redisEndpoint = terraformOutputs.redis_endpoint || terraformOutputs.elasticache_endpoint;
      context.redisPort = terraformOutputs.redis_port || '6379';
      context.loadBalancerUrl = terraformOutputs.alb_dns_name || terraformOutputs.load_balancer_url;
      context.loadBalancerArn = terraformOutputs.alb_arn || terraformOutputs.load_balancer_arn;
      context.cloudfrontUrl = terraformOutputs.cloudfront_url;
      context.cloudfrontDistributionId = terraformOutputs.cloudfront_distribution_id;
      context.cognitoUserPoolId = terraformOutputs.cognito_user_pool_id;
      context.cognitoClientId = terraformOutputs.cognito_client_id;
      context.cognitoRegion = terraformOutputs.cognito_region || 'us-east-1';
      context.vpcId = terraformOutputs.vpc_id;
      context.subnetIds = terraformOutputs.subnet_ids ? terraformOutputs.subnet_ids.split(',') : [];
      context.securityGroupIds = terraformOutputs.security_group_ids ? terraformOutputs.security_group_ids.split(',') : [];
    }

    console.log(`[Infrastructure] Extracted context:`, context);
    return context;
    
  } catch (error: any) {
    console.warn(`[Infrastructure] Failed to get infrastructure context: ${error.message}`);
    console.log(`[Infrastructure] Using default context`);
    return getDefaultInfrastructureContext();
  }
}

/**
 * Get default infrastructure context for development/testing
 */
function getDefaultInfrastructureContext(): InfrastructureContext {
  return {
    // Database configurations
    databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/devdb',
    databaseName: process.env.DATABASE_NAME || 'devdb',
    databaseUsername: process.env.DATABASE_USERNAME || 'postgres',
    databasePassword: process.env.DATABASE_PASSWORD || 'password',
    databasePort: process.env.DATABASE_PORT || '5432',
    databaseType: 'postgresql',
    
    // API Gateway configurations
    apiGatewayUrl: process.env.API_GATEWAY_URL || 'http://localhost:3003',
    apiGatewayId: process.env.API_GATEWAY_ID || 'dev-api-gateway',
    apiGatewayStage: process.env.API_GATEWAY_STAGE || 'dev',
    
    // Lambda function configurations
    lambdaFunctions: {
      main: {
        functionUrl: process.env.LAMBDA_FUNCTION_URL || 'http://localhost:3003',
        functionArn: process.env.LAMBDA_FUNCTION_ARN || 'arn:aws:lambda:us-east-1:123456789012:function:dev-main',
        functionName: 'dev-main-function',
        handler: 'index.handler',
        runtime: 'nodejs18.x',
        timeout: 30,
        memorySize: 128,
        environment: {
          NODE_ENV: 'development',
          DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/devdb'
        }
      }
    },
    lambdaFunctionUrl: process.env.LAMBDA_FUNCTION_URL || 'http://localhost:3003', // Legacy support
    
    // Storage configurations
    s3BucketName: process.env.S3_BUCKET_NAME || 'dev-bucket',
    s3BucketRegion: process.env.S3_BUCKET_REGION || 'us-east-1',
    dynamoDbTableName: process.env.DYNAMODB_TABLE_NAME || 'dev-table',
    dynamoDbTableArn: process.env.DYNAMODB_TABLE_ARN || 'arn:aws:dynamodb:us-east-1:123456789012:table/dev-table',
    
    // Cache configurations
    redisEndpoint: process.env.REDIS_ENDPOINT || 'localhost:6379',
    redisPort: process.env.REDIS_PORT || '6379',
    elasticacheEndpoint: process.env.ELASTICACHE_ENDPOINT || 'localhost:6379',
    
    // Load balancer configurations
    loadBalancerUrl: process.env.LOAD_BALANCER_URL || 'http://localhost:3003',
    loadBalancerArn: process.env.LOAD_BALANCER_ARN || 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/dev-alb',
    
    // CDN configurations
    cloudfrontUrl: process.env.CLOUDFRONT_URL || 'http://localhost:3000',
    cloudfrontDistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID || 'dev-distribution',
    
    // Authentication configurations
    cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID || 'us-east-1_devpool',
    cognitoClientId: process.env.COGNITO_CLIENT_ID || 'dev-client-id',
    cognitoRegion: process.env.COGNITO_REGION || 'us-east-1',
    
    // VPC configurations
    vpcId: process.env.VPC_ID || 'vpc-dev123',
    subnetIds: process.env.SUBNET_IDS ? process.env.SUBNET_IDS.split(',') : ['subnet-dev1', 'subnet-dev2'],
    securityGroupIds: process.env.SECURITY_GROUP_IDS ? process.env.SECURITY_GROUP_IDS.split(',') : ['sg-dev123']
  };
}

/**
 * AI-Driven Code Generation Controller
 * Enhances existing infrastructure and UML-based generation with AI suggestions
 */
export class AIDrivenCodeController {
  /**
   * Generate enhanced code using AI suggestions with existing infrastructure
   */
  async generateEnhancedCode(req: Request, res: Response): Promise<void> {
    const jobId = `ai-enhanced-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log(`[AIDrivenCodeController] 🚀 Starting AI-enhanced code generation for job ${jobId}...`);
      
      const { prompt, projectId, umlDiagrams, infrastructureContext } = req.body;
      
      if (!prompt || !projectId) {
        res.status(400).json({ error: 'Prompt and project ID are required' });
        return;
      }
      
      // Create project directory
      const projectPath = path.join(process.cwd(), 'generated-projects', projectId);
      await fs.mkdir(projectPath, { recursive: true });
      
      console.log(`[AIDrivenCodeController] 📁 Created project directory: ${projectPath}`);
      
      // === PHASE 1: Get Infrastructure Context ===
      console.log(`[AIDrivenCodeController] 🔧 Phase 1: Getting infrastructure context...`);
      
      const infraContext = infrastructureContext || await getInfrastructureContext(projectId);
      console.log(`[AIDrivenCodeController] ✅ Phase 1 Complete: Retrieved infrastructure context`);
      
      // === PHASE 2: Generate Component Plan (Existing Logic) ===
      console.log(`[AIDrivenCodeController] 📋 Phase 2: Generating component plan from UML diagrams...`);
      
      const componentPlan = await generateComponentPlan(
        {
          classDiagram: umlDiagrams?.backendClass,
          sequenceDiagram: umlDiagrams?.backendSequence,
          componentDiagram: umlDiagrams?.backendComponent
        },
        infraContext,
        undefined // semanticContext
      );
      
      console.log(`[AIDrivenCodeController] ✅ Phase 2 Complete: Generated component plan with ${componentPlan.entities.length} entities, ${componentPlan.services.length} services, ${componentPlan.controllers.length} controllers`);
      
      // Save component plan
      const componentPlanPath = path.join(projectPath, 'component-plan.json');
      await fs.writeFile(componentPlanPath, JSON.stringify(componentPlan, null, 2), 'utf-8');
      
      // === PHASE 3: AI Enhancement Analysis ===
      console.log(`[AIDrivenCodeController] 🧠 Phase 3: AI analyzing and suggesting enhancements...`);
      
      const enhancement = await enhanceComponentPlanWithAI(
        componentPlan,
        infraContext,
        umlDiagrams || {},
        undefined // semanticContext
      );
      
      console.log(`[AIDrivenCodeController] ✅ Phase 3 Complete: AI suggested "${enhancement.suggestedPattern}" pattern with ${enhancement.improvements.componentPlan.suggestions.length} improvements`);
      
      // Save AI enhancement suggestions
      const enhancementPath = path.join(projectPath, 'ai-enhancement-suggestions.json');
      await fs.writeFile(enhancementPath, JSON.stringify(enhancement, null, 2), 'utf-8');
      
      // === PHASE 4: Generate Function Signature Contracts (Existing Logic) ===
      console.log(`[AIDrivenCodeController] 📝 Phase 4: Generating function signature contracts...`);
      
      const contracts = await generateFunctionSignatureContracts(componentPlan, infraContext, undefined);
      
      console.log(`[AIDrivenCodeController] ✅ Phase 4 Complete: Generated contracts for ${Object.keys(contracts.entities).length} entities, ${Object.keys(contracts.services).length} services, ${Object.keys(contracts.controllers).length} controllers`);
      
      // Save original contracts
      const contractsPath = path.join(projectPath, 'function-signature-contracts.json');
      await fs.writeFile(contractsPath, JSON.stringify(contracts, null, 2), 'utf-8');
      
      // === PHASE 5: AI Contract Enhancement ===
      console.log(`[AIDrivenCodeController] 🔧 Phase 5: AI enhancing contracts with infrastructure patterns...`);
      
      const enhancedContracts = await enhanceContractsWithAI(
        contracts,
        enhancement,
        infraContext
      );
      
      console.log(`[AIDrivenCodeController] ✅ Phase 5 Complete: Enhanced contracts with AI suggestions`);
      
      // Save enhanced contracts
      const enhancedContractsPath = path.join(projectPath, 'enhanced-function-signature-contracts.json');
      await fs.writeFile(enhancedContractsPath, JSON.stringify(enhancedContracts, null, 2), 'utf-8');
      
      // === PHASE 6: Generate AI-Enhanced Code ===
      console.log(`[AIDrivenCodeController] ⚙️ Phase 6: Generating AI-enhanced code...`);
      
      const codeResults = await generateEnhancedCode(
        enhancedContracts,
        enhancement,
        infraContext,
        projectPath,
        jobId
      );
      
      const successfulFiles = codeResults.filter((r: any) => r.status === 'success').length;
      const failedFiles = codeResults.filter((r: any) => r.status === 'error').length;
      
      console.log(`[AIDrivenCodeController] ✅ Phase 6 Complete: Generated ${successfulFiles} enhanced files successfully, ${failedFiles} failed`);
      
      // === PHASE 7: Generate Build Files ===
      console.log(`[AIDrivenCodeController] 🔧 Phase 7: Generating build files...`);
      
      let buildFilesCount = 0;
      try {
        const buildFilesResult = await generateBuildFiles(
          projectPath,
          infraContext,
          'ai-enhanced-backend'
        );
        
        if (buildFilesResult.success) {
          // Write build files to disk
          for (const buildFile of buildFilesResult.files) {
            const fullPath = path.join(projectPath, buildFile.path);
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, buildFile.content, 'utf-8');
          }
          buildFilesCount = buildFilesResult.files.length;
          console.log(`[AIDrivenCodeController] ✅ Phase 7 Complete: Generated ${buildFilesCount} build files`);
        } else {
          console.log(`[AIDrivenCodeController] ❌ Phase 7 Failed: ${buildFilesResult.error}`);
        }
      } catch (buildError: any) {
        console.log(`[AIDrivenCodeController] ❌ Phase 7 Error: ${buildError.message}`);
      }
      
      // === PHASE 8: Install Dependencies and Build ===
      console.log(`[AIDrivenCodeController] 📦 Phase 8: Installing dependencies and building...`);
      
      try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        // Install dependencies
        const installResult = await execAsync('npm install', { cwd: projectPath });
        console.log(`[AIDrivenCodeController] ✅ Dependencies installed successfully`);
        
        // Run build if package.json has build script
        try {
          const buildResult = await execAsync('npm run build', { cwd: projectPath });
          console.log(`[AIDrivenCodeController] ✅ Build completed successfully`);
        } catch (buildError: any) {
          console.log(`[AIDrivenCodeController] ⚠️ Build failed (this is normal for some projects): ${buildError.message}`);
        }
        
      } catch (installError: any) {
        console.log(`[AIDrivenCodeController] ❌ Dependency installation failed: ${installError.message}`);
      }
      
      // === PHASE 9: Generate Summary ===
      console.log(`[AIDrivenCodeController] 📊 Phase 9: Generating project summary...`);
      
      const summary = {
        projectId,
        architecture: enhancement.suggestedPattern,
        totalComponents: Object.keys(enhancedContracts.entities).length + Object.keys(enhancedContracts.services).length + Object.keys(enhancedContracts.controllers).length + Object.keys(enhancedContracts.repositories).length,
        generatedFiles: successfulFiles,
        failedFiles,
        buildFiles: buildFilesCount,
        projectPath,
        enhancementFile: 'ai-enhancement-suggestions.json',
        originalContractsFile: 'function-signature-contracts.json',
        enhancedContractsFile: 'enhanced-function-signature-contracts.json',
        aiImprovements: {
          componentPlanSuggestions: enhancement.improvements.componentPlan.suggestions.length,
          contractSuggestions: enhancement.improvements.contracts.suggestions.length,
          fileStructureSuggestions: enhancement.improvements.fileStructure.suggestions.length,
          generationOptimizations: enhancement.generationOptimizations.patterns.length
        }
      };
      
      const summaryPath = path.join(projectPath, 'ai-enhanced-generation-summary.json');
      await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
      
      console.log(`[AIDrivenCodeController] 🎉 AI-enhanced code generation completed successfully!`);
      
      // Return success response
      res.json({
        success: true,
        jobId,
        projectId,
        summary,
        enhancement,
        message: `Generated ${successfulFiles} enhanced files using "${enhancement.suggestedPattern}" architecture with AI improvements`
      });
      
    } catch (error: any) {
      console.error('[AIDrivenCodeController] Error in AI-enhanced code generation:', error);
      console.log(`[AIDrivenCodeController] ❌ AI-enhanced code generation failed: ${error.message}`);
      
      res.status(500).json({
        success: false,
        jobId,
        error: error.message,
        message: 'AI-enhanced code generation failed'
      });
    }
  }
  
  /**
   * Get generation logs
   */
  async getLogs(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;
    
    try {
      // This would integrate with your existing logging system
      res.json({
        jobId,
        logs: [`Logs for AI-enhanced job ${jobId} would be retrieved here`],
        status: 'completed'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Stream generation logs
   */
  async streamLogs(req: Request, res: Response): Promise<void> {
    const { jobId } = req.params;
    
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked'
    });
    
    // This would integrate with your existing streaming system
    res.write(`Streaming AI-enhanced logs for job ${jobId}...\n`);
    res.write('This would stream real-time logs here\n');
    res.end();
  }
} 