import { Request, Response } from 'express';
import { DeploymentWizardService } from '../services/deploymentWizardService';
import { DeploymentConfig } from '../types/deployment';

const wizardService = new DeploymentWizardService();

export const getWizardSteps = async (req: Request, res: Response) => {
  try {
    const steps = wizardService.getWizardSteps();
    res.json({ success: true, steps });
  } catch (error) {
    console.error('[Wizard] Error getting steps:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get wizard steps' 
    });
  }
};

export const getSmartDefaults = async (req: Request, res: Response) => {
  try {
    const { appType } = req.params;
    const defaults = wizardService.getSmartDefaults(appType);
    res.json({ success: true, defaults });
  } catch (error) {
    console.error('[Wizard] Error getting defaults:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get smart defaults' 
    });
  }
};

export const validateConfiguration = async (req: Request, res: Response) => {
  try {
    const config: DeploymentConfig = req.body;
    const errors = wizardService.validateConfiguration(config);
    
    res.json({ 
      success: errors.length === 0, 
      errors,
      isValid: errors.length === 0
    });
  } catch (error) {
    console.error('[Wizard] Error validating configuration:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to validate configuration' 
    });
  }
};

export const generatePreview = async (req: Request, res: Response) => {
  try {
    const config: DeploymentConfig = req.body;
    const preview = wizardService.generatePreview(config);
    
    res.json({ success: true, preview });
  } catch (error) {
    console.error('[Wizard] Error generating preview:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate preview' 
    });
  }
};

export const saveConfiguration = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const config: DeploymentConfig = req.body;
    
    // Validate configuration
    const errors = wizardService.validateConfiguration(config);
    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        errors 
      });
    }
    
    // Save configuration to database
    // TODO: Implement database save
    
    res.json({ 
      success: true, 
      message: 'Configuration saved successfully',
      projectId 
    });
  } catch (error) {
    console.error('[Wizard] Error saving configuration:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save configuration' 
    });
  }
}; 