import { Request, Response } from 'express';
import { awsPricingService } from '../services/awsPricingService';
import { dynamicPricingService } from '../services/dynamicPricingService';
import asyncHandler from '../utils/asyncHandler';

// Get pricing cache status
export const getPricingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = awsPricingService.getCacheStatus();
    res.json({
      success: true,
      status,
      message: status.isValid ? 'Pricing cache is valid' : 'Pricing cache needs refresh'
    });
  } catch (error) {
    console.error('[Pricing Controller] Error getting pricing status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pricing status'
    });
  }
};

// Force refresh pricing
export const refreshPricing = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[Pricing Controller] Manual pricing refresh requested');
    
    // Start the refresh process
    awsPricingService.forceRefresh().then(() => {
      console.log('[Pricing Controller] Pricing refresh completed');
    }).catch((error) => {
      console.error('[Pricing Controller] Pricing refresh failed:', error);
    });

    res.json({
      success: true,
      message: 'Pricing refresh started. This may take a few minutes.',
      status: 'refreshing'
    });
  } catch (error) {
    console.error('[Pricing Controller] Error starting pricing refresh:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start pricing refresh'
    });
  }
};

// Get specific pricing data
export const getPricingData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { service, region = 'us-east-1' } = req.query;
    
    if (!service) {
      res.status(400).json({
        success: false,
        error: 'Service parameter is required'
      });
      return;
    }

    let pricingData: any = {};

    switch (service) {
      case 'EC2':
        // Get common EC2 instance types
        const instanceTypes = ['t3.micro', 't3.small', 't3.medium', 't3.large', 'm5.large', 'm5.xlarge'];
        for (const instanceType of instanceTypes) {
          const price = awsPricingService.getEC2Price(instanceType, region as string);
          if (price) {
            pricingData[instanceType] = {
              hourly: price,
              monthly: awsPricingService.calculateEC2MonthlyCost(instanceType, region as string)
            };
          }
        }
        break;

      case 'S3':
        pricingData = {
          storage: awsPricingService.getS3Price('TimedStorage-ByteHrs', region as string),
          requests: awsPricingService.getS3Price('Requests-Tier1', region as string),
          exampleMonthly: awsPricingService.calculateS3MonthlyCost(10, 100000, region as string) // 10GB, 100K requests
        };
        break;

      case 'Lambda':
        pricingData = {
          requests: awsPricingService.getLambdaPrice('Requests', region as string),
          duration: awsPricingService.getLambdaPrice('Duration', region as string),
          exampleMonthly: awsPricingService.calculateLambdaMonthlyCost(1000000, 100, region as string) // 1M requests, 100ms avg
        };
        break;

      case 'DynamoDB':
        pricingData = {
          storage: awsPricingService.getDynamoDBPrice('TimedStorage-ByteHrs', region as string),
          reads: awsPricingService.getDynamoDBPrice('ReadRequestUnits', region as string),
          writes: awsPricingService.getDynamoDBPrice('WriteRequestUnits', region as string),
          exampleMonthly: awsPricingService.calculateDynamoDBMonthlyCost(5, 1000000, 500000, region as string) // 5GB, 1M reads, 500K writes
        };
        break;

      case 'RDS':
        const rdsInstanceTypes = ['db.t3.micro', 'db.t3.small', 'db.t3.medium', 'db.m5.large'];
        for (const instanceType of rdsInstanceTypes) {
          const price = awsPricingService.getRDSPrice(instanceType, region as string);
          if (price) {
            pricingData[instanceType] = {
              hourly: price,
              monthly: awsPricingService.calculateRDSMonthlyCost(instanceType, region as string)
            };
          }
        }
        break;

      case 'APIGateway':
        pricingData = {
          requests: awsPricingService.getAPIGatewayPrice('Requests', region as string),
          exampleMonthly: awsPricingService.calculateAPIGatewayMonthlyCost(1000000, region as string) // 1M requests
        };
        break;

      default:
        res.status(400).json({
          success: false,
          error: `Unsupported service: ${service}. Supported services: EC2, S3, Lambda, DynamoDB, RDS, APIGateway`
        });
        return;
    }

    res.json({
      success: true,
      service,
      region,
      pricing: pricingData,
      cacheStatus: awsPricingService.getCacheStatus()
    });

  } catch (error) {
    console.error('[Pricing Controller] Error getting pricing data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pricing data'
    });
  }
};

// Get all pricing data for infrastructure tier generation
export const getAllPricingData = async (req: Request, res: Response): Promise<void> => {
  try {
    const region = req.query.region as string || 'us-east-1';
    
    const pricingData = {
      EC2: {
        t3_micro: awsPricingService.calculateEC2MonthlyCost('t3.micro', region),
        t3_small: awsPricingService.calculateEC2MonthlyCost('t3.small', region),
        t3_medium: awsPricingService.calculateEC2MonthlyCost('t3.medium', region),
        t3_large: awsPricingService.calculateEC2MonthlyCost('t3.large', region),
        m5_large: awsPricingService.calculateEC2MonthlyCost('m5.large', region),
        m5_xlarge: awsPricingService.calculateEC2MonthlyCost('m5.xlarge', region)
      },
      S3: {
        storage_1gb: awsPricingService.calculateS3MonthlyCost(1, 10000, region),
        storage_10gb: awsPricingService.calculateS3MonthlyCost(10, 100000, region),
        storage_100gb: awsPricingService.calculateS3MonthlyCost(100, 1000000, region)
      },
      Lambda: {
        low_usage: awsPricingService.calculateLambdaMonthlyCost(100000, 100, region), // 100K requests, 100ms
        medium_usage: awsPricingService.calculateLambdaMonthlyCost(1000000, 200, region), // 1M requests, 200ms
        high_usage: awsPricingService.calculateLambdaMonthlyCost(10000000, 500, region) // 10M requests, 500ms
      },
      DynamoDB: {
        small: awsPricingService.calculateDynamoDBMonthlyCost(1, 100000, 50000, region), // 1GB, 100K reads, 50K writes
        medium: awsPricingService.calculateDynamoDBMonthlyCost(10, 1000000, 500000, region), // 10GB, 1M reads, 500K writes
        large: awsPricingService.calculateDynamoDBMonthlyCost(100, 10000000, 5000000, region) // 100GB, 10M reads, 5M writes
      },
      RDS: {
        t3_micro: awsPricingService.calculateRDSMonthlyCost('db.t3.micro', region),
        t3_small: awsPricingService.calculateRDSMonthlyCost('db.t3.small', region),
        t3_medium: awsPricingService.calculateRDSMonthlyCost('db.t3.medium', region),
        m5_large: awsPricingService.calculateRDSMonthlyCost('db.m5.large', region)
      },
      APIGateway: {
        low_usage: awsPricingService.calculateAPIGatewayMonthlyCost(100000, region), // 100K requests
        medium_usage: awsPricingService.calculateAPIGatewayMonthlyCost(1000000, region), // 1M requests
        high_usage: awsPricingService.calculateAPIGatewayMonthlyCost(10000000, region) // 10M requests
      }
    };

    res.json({
      success: true,
      region,
      pricing: pricingData,
      cacheStatus: awsPricingService.getCacheStatus(),
      lastUpdated: awsPricingService.getCacheStatus().lastUpdated
    });

  } catch (error) {
    console.error('[Pricing Controller] Error getting all pricing data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pricing data'
    });
  }
};

// Get on-demand pricing for any service
export const getOnDemandPricing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { service, region = 'us-east-1', usage } = req.body;
    
    if (!service) {
      res.status(400).json({
        success: false,
        error: 'Service parameter is required'
      });
      return;
    }

    console.log(`[Pricing Controller] Getting on-demand pricing for ${service}...`);
    
    let result: any = {};
    
    if (usage) {
      // Calculate monthly cost with usage parameters
      const monthlyCost = await awsPricingService.calculateServiceMonthlyCost(service, usage, region);
      result = {
        service,
        region,
        usage,
        estimatedMonthlyCost: monthlyCost,
        pricing: await awsPricingService.getServicePricing(service, region)
      };
    } else {
      // Just get pricing data
      result = {
        service,
        region,
        pricing: await awsPricingService.getServicePricing(service, region)
      };
    }

    res.json({
      success: true,
      ...result,
      cacheStatus: awsPricingService.getCacheStatus()
    });

  } catch (error) {
    console.error('[Pricing Controller] Error getting on-demand pricing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get on-demand pricing'
    });
  }
};

// Get pricing for multiple services at once
export const getBulkPricing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { services, region = 'us-east-1' } = req.body;
    
    if (!services || !Array.isArray(services)) {
      res.status(400).json({
        success: false,
        error: 'Services array is required'
      });
      return;
    }

    console.log(`[Pricing Controller] Getting bulk pricing for ${services.length} services...`);
    
    const results: any = {};
    
    for (const service of services) {
      try {
        results[service] = await awsPricingService.getServicePricing(service, region);
      } catch (error) {
        console.error(`[Pricing Controller] Failed to get pricing for ${service}:`, error);
        results[service] = null;
      }
    }

    res.json({
      success: true,
      region,
      services: results,
      cacheStatus: awsPricingService.getCacheStatus()
    });

  } catch (error) {
    console.error('[Pricing Controller] Error getting bulk pricing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bulk pricing'
    });
  }
}; 

// Test dynamic pricing service
export const testDynamicPricing = asyncHandler(async (req, res) => {
  const { service, scenario, region = 'us-east-1' } = req.query;
  
  if (!service || !scenario) {
    return res.status(400).json({ 
      error: 'Missing required parameters: service and scenario' 
    });
  }

  try {
    const cost = await dynamicPricingService.calculateServiceCost(
      service as string, 
      scenario as string, 
      region as string
    );
    
    const cacheStatus = dynamicPricingService.getCacheStatus();
    
    res.json({
      service,
      scenario,
      region,
      monthlyCost: cost,
      cacheStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Pricing Controller] Dynamic pricing test failed:', error);
    res.status(500).json({ 
      error: 'Failed to calculate dynamic pricing',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get dynamic pricing cache status
export const getDynamicPricingStatus = asyncHandler(async (req, res) => {
  try {
    const cacheStatus = dynamicPricingService.getCacheStatus();
    
    res.json({
      cacheStatus,
      timestamp: new Date().toISOString(),
      note: "Dynamic pricing service cache status"
    });
  } catch (error) {
    console.error('[Pricing Controller] Failed to get dynamic pricing status:', error);
    res.status(500).json({ 
      error: 'Failed to get dynamic pricing status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}); 