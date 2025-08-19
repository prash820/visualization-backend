import { Request, Response } from 'express';
import { deploymentService } from '../services/deploymentService';
import { AuthRequest } from '../types/express';
import { DatabaseService } from '../services/databaseService';

// Start a new deployment
export const startDeployment = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, source, environment, infrastructureId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!projectId || !source || !environment || !infrastructureId) {
      return res.status(400).json({ 
        error: 'Missing required fields: projectId, source, environment, infrastructureId' 
      });
    }

    // Validate source type
    if (!['github', 'gitlab', 'zip'].includes(source.type)) {
      return res.status(400).json({ 
        error: 'Invalid source type. Must be github, gitlab, or zip' 
      });
    }

    // Validate environment
    if (!['dev', 'staging', 'prod'].includes(environment)) {
      return res.status(400).json({ 
        error: 'Invalid environment. Must be dev, staging, or prod' 
      });
    }

    // If GitHub/GitLab, validate URL
    if (source.type === 'github' || source.type === 'gitlab') {
      if (!source.url) {
        return res.status(400).json({ 
          error: 'URL is required for GitHub/GitLab deployments' 
        });
      }
    }

    // If ZIP, validate file path
    if (source.type === 'zip') {
      if (!source.url) {
        return res.status(400).json({ 
          error: 'File path is required for ZIP deployments' 
        });
      }
    }

    const deploymentConfig = {
      projectId,
      userId,
      source,
      environment,
      infrastructureId
    };

    const deploymentId = await deploymentService.startDeployment(deploymentConfig);

    res.json({
      deploymentId,
      status: 'started',
      message: 'Deployment started successfully'
    });

  } catch (error) {
    console.error('Error starting deployment:', error);
    res.status(500).json({
      error: 'Failed to start deployment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get deployment status
export const getDeploymentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { deploymentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!deploymentId) {
      return res.status(400).json({ error: 'Deployment ID is required' });
    }

    const deployment = await deploymentService.getDeploymentStatus(deploymentId);

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    // Check if user has access to this deployment
    if (deployment.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(deployment);

  } catch (error) {
    console.error('Error getting deployment status:', error);
    res.status(500).json({
      error: 'Failed to get deployment status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get deployment history for a project
export const getDeploymentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const deployments = await deploymentService.getDeploymentHistory(projectId);

    // Filter deployments by user access (in a real app, you'd check project ownership)
    const userDeployments = deployments.filter(d => d.userId === userId);

    res.json({
      deployments: userDeployments,
      total: userDeployments.length
    });

  } catch (error) {
    console.error('Error getting deployment history:', error);
    res.status(500).json({
      error: 'Failed to get deployment history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Rollback deployment
export const rollbackDeployment = async (req: AuthRequest, res: Response) => {
  try {
    const { deploymentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!deploymentId) {
      return res.status(400).json({ error: 'Deployment ID is required' });
    }

    // Check if deployment exists and user has access
    const deployment = await deploymentService.getDeploymentStatus(deploymentId);
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    if (deployment.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow rollback of completed deployments
    if (deployment.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Only completed deployments can be rolled back' 
      });
    }

    await deploymentService.rollbackDeployment(deploymentId);

    res.json({
      message: 'Rollback initiated successfully',
      deploymentId
    });

  } catch (error) {
    console.error('Error rolling back deployment:', error);
    res.status(500).json({
      error: 'Failed to rollback deployment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Save user token (GitHub/GitLab)
export const saveUserToken = async (req: AuthRequest, res: Response) => {
  try {
    const { provider, token } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!provider || !token) {
      return res.status(400).json({ 
        error: 'Provider and token are required' 
      });
    }

    if (!['github', 'gitlab'].includes(provider)) {
      return res.status(400).json({ 
        error: 'Invalid provider. Must be github or gitlab' 
      });
    }

    await deploymentService.saveUserToken(userId, provider, token);

    res.json({
      message: 'Token saved successfully',
      provider
    });

  } catch (error) {
    console.error('Error saving user token:', error);
    res.status(500).json({
      error: 'Failed to save token',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get user token
export const getUserToken = async (req: AuthRequest, res: Response) => {
  try {
    const { provider } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }

    if (!['github', 'gitlab'].includes(provider)) {
      return res.status(400).json({ 
        error: 'Invalid provider. Must be github or gitlab' 
      });
    }

    const token = await deploymentService.getUserToken(userId, provider as 'github' | 'gitlab');

    res.json({
      hasToken: !!token,
      provider
    });

  } catch (error) {
    console.error('Error getting user token:', error);
    res.status(500).json({
      error: 'Failed to get token',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete user token
export const deleteUserToken = async (req: AuthRequest, res: Response) => {
  try {
    const { provider } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }

    if (!['github', 'gitlab'].includes(provider)) {
      return res.status(400).json({ 
        error: 'Invalid provider. Must be github or gitlab' 
      });
    }

    await deploymentService.deleteUserToken(userId, provider as 'github' | 'gitlab');

    res.json({
      message: 'Token deleted successfully',
      provider
    });

  } catch (error) {
    console.error('Error deleting user token:', error);
    res.status(500).json({
      error: 'Failed to delete token',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 

// Cleanup infrastructure
export const cleanupInfrastructure = async (req: AuthRequest, res: Response) => {
  try {
    const { infrastructureId, projectId } = req.body
    
    if (!infrastructureId || !projectId) {
      res.status(400).json({ error: 'infrastructureId and projectId are required' })
      return
    }

    // Verify user has access to the project
    const databaseService = DatabaseService.getInstance()
    const project = databaseService.getProject(projectId)
    if (!project || project.userId !== req.user.id) {
      res.status(403).json({ error: 'Access denied to project' })
      return
    }

    await deploymentService.cleanupInfrastructure(infrastructureId, projectId)
    
    res.json({ 
      success: true, 
      message: 'Infrastructure cleanup initiated successfully' 
    })
  } catch (error) {
    console.error('Cleanup infrastructure error:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to cleanup infrastructure' 
    })
  }
}

// Get cleanup status
export const getCleanupStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { infrastructureId } = req.params
    
    if (!infrastructureId) {
      res.status(400).json({ error: 'infrastructureId is required' })
      return
    }

    const status = await deploymentService.getCleanupStatus(infrastructureId)
    
    res.json(status)
  } catch (error) {
    console.error('Get cleanup status error:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get cleanup status' 
    })
  }
} 