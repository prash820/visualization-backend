import { DeploymentConfig, DeploymentWizardStep, DeploymentWizardField, DeploymentPreview } from '../types/deployment';

export class DeploymentWizardService {
  
  /**
   * Get all wizard steps for the deployment configuration
   */
  getWizardSteps(): DeploymentWizardStep[] {
    return [
      this.getApplicationTypeStep(),
      this.getFrameworkStep(),
      this.getBuildConfigurationStep(),
      this.getDatabaseStep(),
      this.getEnvironmentVariablesStep(),
      this.getResourceAssociationStep(),
      this.getDeploymentSettingsStep(),
      this.getPreviewStep()
    ];
  }

  /**
   * Step 1: Application Type Selection
   */
  private getApplicationTypeStep(): DeploymentWizardStep {
    return {
      id: 'app-type',
      title: 'Application Type',
      description: 'What type of application are you deploying?',
      fields: [
        {
          name: 'appType',
          type: 'radio',
          label: 'Application Type',
          required: true,
          options: [
            { value: 'frontend', label: 'Frontend Application (React, Vue, Angular)' },
            { value: 'backend', label: 'Backend API (Node.js, Python, Java)' },
            { value: 'fullstack', label: 'Full-Stack Application' },
            { value: 'static', label: 'Static Website (HTML, CSS, JS)' }
          ]
        }
      ]
    };
  }

  /**
   * Step 2: Framework Detection
   */
  private getFrameworkStep(): DeploymentWizardStep {
    return {
      id: 'framework',
      title: 'Framework & Technology',
      description: 'What framework or technology stack are you using?',
      fields: [
        {
          name: 'framework',
          type: 'select',
          label: 'Framework',
          description: 'Select your primary framework',
          options: [
            { value: 'react', label: 'React' },
            { value: 'vue', label: 'Vue.js' },
            { value: 'angular', label: 'Angular' },
            { value: 'nextjs', label: 'Next.js' },
            { value: 'express', label: 'Express.js (Node.js)' },
            { value: 'fastapi', label: 'FastAPI (Python)' },
            { value: 'django', label: 'Django (Python)' },
            { value: 'flask', label: 'Flask (Python)' },
            { value: 'spring', label: 'Spring Boot (Java)' },
            { value: 'go', label: 'Go' }
          ]
        },
        {
          name: 'runtime',
          type: 'select',
          label: 'Runtime Environment',
          description: 'Select the runtime for your application',
          options: [
            { value: 'nodejs18.x', label: 'Node.js 18.x' },
            { value: 'python3.11', label: 'Python 3.11' },
            { value: 'java11', label: 'Java 11' },
            { value: 'go1.x', label: 'Go 1.x' }
          ]
        }
      ]
    };
  }

  /**
   * Step 3: Build Configuration
   */
  private getBuildConfigurationStep(): DeploymentWizardStep {
    return {
      id: 'build-config',
      title: 'Build Configuration',
      description: 'How should we build your application?',
      fields: [
        {
          name: 'buildCommand',
          type: 'text',
          label: 'Build Command',
          description: 'Command to build your application (e.g., npm run build)',
          placeholder: 'npm run build',
          defaultValue: 'npm run build'
        },
        {
          name: 'outputDirectory',
          type: 'text',
          label: 'Output Directory',
          description: 'Directory containing built files',
          placeholder: 'dist, build, or public',
          defaultValue: 'dist'
        },
        {
          name: 'entryPoint',
          type: 'text',
          label: 'Entry Point',
          description: 'Main entry point for your application',
          placeholder: 'index.js, app.py, or main.go'
        }
      ]
    };
  }

  /**
   * Step 4: Database Configuration
   */
  private getDatabaseStep(): DeploymentWizardStep {
    return {
      id: 'database',
      title: 'Database Configuration',
      description: 'Do you need a database for your application?',
      fields: [
        {
          name: 'databaseType',
          type: 'radio',
          label: 'Database Type',
          options: [
            { value: 'none', label: 'No Database Required' },
            { value: 'rds', label: 'RDS (PostgreSQL, MySQL)' },
            { value: 'dynamodb', label: 'DynamoDB (NoSQL)' }
          ]
        },
        {
          name: 'databaseName',
          type: 'text',
          label: 'Database Name',
          description: 'Name for your database',
          placeholder: 'myapp_db'
        }
      ]
    };
  }

  /**
   * Step 5: Environment Variables
   */
  private getEnvironmentVariablesStep(): DeploymentWizardStep {
    return {
      id: 'env-vars',
      title: 'Environment Variables',
      description: 'Configure environment variables for your application',
      fields: [
        {
          name: 'environmentVariables',
          type: 'textarea',
          label: 'Environment Variables',
          description: 'Enter environment variables in KEY=VALUE format (one per line)',
          placeholder: 'NODE_ENV=production\nPORT=3000\nDATABASE_URL=your-db-url'
        }
      ]
    };
  }

  /**
   * Step 6: Resource Association
   */
  private getResourceAssociationStep(): DeploymentWizardStep {
    return {
      id: 'resources',
      title: 'Resource Association',
      description: 'Associate your application with existing infrastructure resources',
      fields: [
        {
          name: 'resources.database',
          type: 'text',
          label: 'Database Resource',
          description: 'Database resource name from your infrastructure',
          placeholder: 'aws_rds_instance.main'
        },
        {
          name: 'resources.apiGateway',
          type: 'text',
          label: 'API Gateway',
          description: 'API Gateway resource name',
          placeholder: 'aws_api_gateway_rest_api.main'
        },
        {
          name: 'resources.s3Bucket',
          type: 'text',
          label: 'S3 Bucket',
          description: 'S3 bucket for static files',
          placeholder: 'aws_s3_bucket.frontend'
        }
      ]
    };
  }

  /**
   * Step 7: Deployment Settings
   */
  private getDeploymentSettingsStep(): DeploymentWizardStep {
    return {
      id: 'deployment-settings',
      title: 'Deployment Settings',
      description: 'Configure deployment behavior and settings',
      fields: [
        {
          name: 'deploymentSettings.autoDeploy',
          type: 'checkbox',
          label: 'Auto Deploy',
          description: 'Automatically deploy when code changes'
        },
        {
          name: 'deploymentSettings.rollbackOnFailure',
          type: 'checkbox',
          label: 'Rollback on Failure',
          description: 'Automatically rollback if deployment fails'
        },
        {
          name: 'deploymentSettings.corsEnabled',
          type: 'checkbox',
          label: 'Enable CORS',
          description: 'Enable Cross-Origin Resource Sharing'
        },
        {
          name: 'deploymentSettings.corsOrigins',
          type: 'text',
          label: 'CORS Origins',
          description: 'Allowed origins for CORS (comma-separated)',
          placeholder: 'https://yourdomain.com, https://app.yourdomain.com'
        }
      ]
    };
  }

  /**
   * Step 8: Preview
   */
  private getPreviewStep(): DeploymentWizardStep {
    return {
      id: 'preview',
      title: 'Deployment Preview',
      description: 'Review your deployment configuration',
      fields: []
    };
  }

  /**
   * Generate deployment preview based on configuration
   */
  generatePreview(config: DeploymentConfig): DeploymentPreview {
    const resources = this.getResourceAssociations(config);
    const environmentVariables = this.parseEnvironmentVariables(config.environmentVariables);
    const buildSteps = this.getBuildSteps(config);
    const deploymentSteps = this.getDeploymentSteps(config);

    return {
      resources,
      environmentVariables,
      buildSteps,
      deploymentSteps,
      estimatedCost: this.estimateCost(config),
      estimatedTime: this.estimateTime(config)
    };
  }

  /**
   * Get smart defaults based on application type
   */
  getSmartDefaults(appType: string): Partial<DeploymentConfig> {
    const defaults: Record<string, Partial<DeploymentConfig>> = {
      frontend: {
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        runtime: 'nodejs18.x',
        deploymentSettings: {
          autoDeploy: true,
          rollbackOnFailure: true,
          corsEnabled: true,
          corsOrigins: ['*']
        }
      },
      backend: {
        buildCommand: 'npm install',
        entryPoint: 'index.js',
        runtime: 'nodejs18.x',
        databaseType: 'dynamodb',
        deploymentSettings: {
          autoDeploy: false,
          rollbackOnFailure: true,
          corsEnabled: true
        }
      },
      fullstack: {
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        runtime: 'nodejs18.x',
        databaseType: 'dynamodb',
        deploymentSettings: {
          autoDeploy: true,
          rollbackOnFailure: true,
          corsEnabled: true
        }
      },
      static: {
        buildCommand: '',
        outputDirectory: '.',
        deploymentSettings: {
          autoDeploy: true,
          rollbackOnFailure: false,
          corsEnabled: false
        }
      }
    };

    return defaults[appType] || {};
  }

  /**
   * Validate configuration
   */
  validateConfiguration(config: DeploymentConfig): string[] {
    const errors: string[] = [];

    if (!config.appType) {
      errors.push('Application type is required');
    }

    if (config.appType === 'frontend' && !config.buildCommand) {
      errors.push('Build command is required for frontend applications');
    }

    if (config.databaseType && config.databaseType !== 'none' && !config.databaseName) {
      errors.push('Database name is required when using a database');
    }

    return errors;
  }

  private getResourceAssociations(config: DeploymentConfig) {
    const resources = [];
    
    if (config.resources.database) {
      resources.push({
        type: 'Database',
        name: config.resources.database,
        configuration: { type: config.databaseType }
      });
    }

    if (config.resources.s3Bucket) {
      resources.push({
        type: 'S3 Bucket',
        name: config.resources.s3Bucket,
        configuration: { purpose: 'Static files' }
      });
    }

    return resources;
  }

  private parseEnvironmentVariables(envVars: Record<string, string> | string): Record<string, string> {
    if (typeof envVars === 'string') {
      const parsed: Record<string, string> = {};
      envVars.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          parsed[key.trim()] = value.trim();
        }
      });
      return parsed;
    }
    return envVars;
  }

  private getBuildSteps(config: DeploymentConfig): string[] {
    const steps = [];
    
    if (config.buildCommand) {
      steps.push(`Run: ${config.buildCommand}`);
    }
    
    if (config.outputDirectory) {
      steps.push(`Collect files from: ${config.outputDirectory}`);
    }
    
    return steps;
  }

  private getDeploymentSteps(config: DeploymentConfig): string[] {
    const steps = [];
    
    if (config.appType === 'frontend' || config.appType === 'static') {
      steps.push('Upload files to S3 bucket');
      steps.push('Configure CloudFront distribution');
    }
    
    if (config.appType === 'backend') {
      steps.push('Package application');
      steps.push('Deploy to Lambda or EC2');
      steps.push('Configure API Gateway');
    }
    
    return steps;
  }

  private estimateCost(config: DeploymentConfig): number {
    let baseCost = 0;
    
    if (config.appType === 'frontend' || config.appType === 'static') {
      baseCost += 5; // S3 + CloudFront
    }
    
    if (config.appType === 'backend') {
      baseCost += 20; // Lambda + API Gateway
    }
    
    if (config.databaseType === 'rds') {
      baseCost += 25; // RDS instance
    }
    
    if (config.databaseType === 'dynamodb') {
      baseCost += 10; // DynamoDB
    }
    
    return baseCost;
  }

  private estimateTime(config: DeploymentConfig): string {
    if (config.appType === 'static') {
      return '2-3 minutes';
    }
    
    if (config.appType === 'frontend') {
      return '5-8 minutes';
    }
    
    if (config.appType === 'backend') {
      return '8-12 minutes';
    }
    
    return '10-15 minutes';
  }
} 