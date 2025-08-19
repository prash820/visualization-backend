import AWS from 'aws-sdk';
import { awsPricingService } from './awsPricingService';

// AWS Pricing API client
const pricingClient = new AWS.Pricing({
  region: 'us-east-1', // Pricing API is only available in us-east-1
  apiVersion: '2017-10-15'
});

interface PricingCache {
  [serviceName: string]: {
    [region: string]: {
      [usageType: string]: {
        pricePerUnit: number;
        unit: string;
        description: string;
        lastUpdated: string;
      };
    };
  };
}

interface ServicePricingRequest {
  serviceName: string;
  region: string;
  usageType?: string;
  filters?: AWS.Pricing.Filter[];
}

export class DynamicPricingService {
  private cache: PricingCache = {};
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  // Generic method to calculate monthly cost for ANY AWS service
  async calculateMonthlyCost(
    serviceName: string,
    usage: { [key: string]: number },
    region: string = 'us-east-1'
  ): Promise<number> {
    try {
      const pricing = await this.getServicePricing(serviceName, region);
      if (!pricing) return 0;

      let totalCost = 0;
      
      for (const [usageType, amount] of Object.entries(usage)) {
        if (pricing[usageType]?.pricePerUnit) {
          totalCost += amount * pricing[usageType].pricePerUnit;
        }
      }

      return totalCost;
    } catch (error) {
      console.error(`[Dynamic Pricing] Failed to calculate monthly cost for ${serviceName}:`, error);
      return 0;
    }
  }

  // Get pricing for any service (cached or real-time)
  async getServicePricing(serviceName: string, region: string = 'us-east-1'): Promise<any> {
    const cacheKey = `${serviceName}-${region}`;
    
    // Check cache first
    if (this.cache[serviceName]?.[region] && this.isCacheValid(serviceName, region)) {
      return this.cache[serviceName][region];
    }

    // Fetch real-time pricing
    const pricing = await this.fetchRealTimePricing(serviceName, region);
    
    // Cache the result
    if (pricing) {
      if (!this.cache[serviceName]) {
        this.cache[serviceName] = {};
      }
      this.cache[serviceName][region] = pricing;
    }

    return pricing;
  }

  // Fetch real-time pricing from AWS Pricing API
  private async fetchRealTimePricing(serviceName: string, region: string = 'us-east-1'): Promise<any> {
    try {
      console.log(`[Dynamic Pricing] Fetching real-time pricing for ${serviceName} in ${region}`);
      
      const serviceCode = this.mapServiceNameToCode(serviceName);
      if (!serviceCode) {
        console.warn(`[Dynamic Pricing] Unknown service: ${serviceName}`);
        return null;
      }

      const filters: AWS.Pricing.Filter[] = [
        {
          Type: 'TERM_MATCH',
          Field: 'ServiceCode',
          Value: serviceCode
        },
        {
          Type: 'TERM_MATCH',
          Field: 'CurrencyCode',
          Value: 'USD'
        }
      ];

      // Add region filter if not us-east-1 (pricing API limitation)
      if (region !== 'us-east-1') {
        filters.push({
          Type: 'TERM_MATCH',
          Field: 'region',
          Value: region
        });
      }

      const response = await pricingClient.getProducts({
        ServiceCode: serviceCode,
        Filters: filters,
        MaxResults: 100
      }).promise();

      if (response.PriceList) {
        return this.parsePricingResponse(response.PriceList, region);
      }

      return null;
    } catch (error) {
      console.error(`[Dynamic Pricing] Failed to fetch pricing for ${serviceName}:`, error);
      return null;
    }
  }

  // Parse AWS Pricing API response
  private parsePricingResponse(priceList: string[], region: string): any {
    const parsedPrices: any = {};

    for (const priceData of priceList) {
      try {
        const price = JSON.parse(priceData);
        const product = price.product;
        const terms = price.terms;

        if (!product || !terms) continue;

        // Extract usage type
        const usageType = product.attributes?.usagetype || 'default';
        
        if (!parsedPrices[usageType]) {
          parsedPrices[usageType] = {};
        }

        // Extract OnDemand pricing
        const onDemandTerms = terms.OnDemand;
        if (onDemandTerms) {
          const termKey = Object.keys(onDemandTerms)[0];
          const priceDimensions = onDemandTerms[termKey].priceDimensions;
          const priceKey = Object.keys(priceDimensions)[0];
          const pricePerUnit = parseFloat(priceDimensions[priceKey].pricePerUnit.USD);
          
          parsedPrices[usageType] = {
            pricePerUnit,
            unit: priceDimensions[priceKey].unit,
            description: priceDimensions[priceKey].description,
            lastUpdated: new Date().toISOString()
          };
        }

      } catch (error) {
        console.error('[Dynamic Pricing] Failed to parse price data:', error);
      }
    }

    return parsedPrices;
  }

  // Map service names to AWS service codes
  private mapServiceNameToCode(serviceName: string): string | null {
    const serviceMap: { [key: string]: string } = {
      // Core services
      'ec2': 'AmazonEC2',
      's3': 'AmazonS3',
      'lambda': 'AWSLambda',
      'dynamodb': 'AmazonDynamoDB',
      'rds': 'AmazonRDS',
      'apigateway': 'AmazonApiGateway',
      
      // Caching and CDN
      'cloudfront': 'AmazonCloudFront',
      'elasticache': 'AmazonElastiCache',
      
      // Security
      'waf': 'AWSWAF',
      'shield': 'AWSShield',
      'guardduty': 'AmazonGuardDuty',
      
      // Networking
      'vpc': 'AmazonVPC',
      'elb': 'AWSElasticLoadBalancing',
      'alb': 'AWSElasticLoadBalancing',
      'nlb': 'AWSElasticLoadBalancing',
      'route53': 'AmazonRoute53',
      
      // Storage
      'efs': 'AmazonEFS',
      'fsx': 'AmazonFSx',
      'glacier': 'AmazonS3Glacier',
      
      // Analytics
      'redshift': 'AmazonRedshift',
      'athena': 'AmazonAthena',
      'kinesis': 'AmazonKinesis',
      
      // AI/ML
      'sagemaker': 'AmazonSageMaker',
      'comprehend': 'AmazonComprehend',
      'rekognition': 'AmazonRekognition',
      
      // Containers
      'ecs': 'AmazonECS',
      'eks': 'AmazonEKS',
      'ecr': 'AmazonECR',
      
      // Messaging
      'sqs': 'AmazonSQS',
      'sns': 'AmazonSNS',
      'ses': 'AmazonSES',
      
      // Monitoring
      'cloudwatch': 'AmazonCloudWatch',
      'cloudtrail': 'AWSCloudTrail',
      
      // Management
      'iam': 'AWSIdentityandAccessManagement',
      'secretsmanager': 'AWSSecretsManager',
      'systemsmanager': 'AWSSystemsManager',
      
      // Development
      'codebuild': 'AWSCodeBuild',
      'codepipeline': 'AWSCodePipeline',
      'cloudformation': 'AWSCloudFormation',
      
      // IoT
      'iot': 'AWSIoT',
      'greengrass': 'AWSIoTGreengrass',
      
      // Media
      'mediaconvert': 'AWSMediaConvert',
      'medialive': 'AWSMediaLive',
      
      // Gaming
      'gamelift': 'AmazonGameLift',
      
      // Blockchain
      'managedblockchain': 'AmazonManagedBlockchain',
      
      // Quantum
      'braket': 'AmazonBraket'
    };

    const normalizedName = serviceName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return serviceMap[normalizedName] || null;
  }

  // Check if cache is still valid
  private isCacheValid(serviceName: string, region: string): boolean {
    const cachedData = this.cache[serviceName]?.[region];
    if (!cachedData) return false;

    // Check if any usage type has expired
    for (const usageType of Object.values(cachedData)) {
      const lastUpdated = new Date(usageType.lastUpdated).getTime();
      if (Date.now() - lastUpdated > this.cacheExpiry) {
        return false;
      }
    }

    return true;
  }

  // Predefined cost calculation templates for common scenarios
  async calculateServiceCost(serviceName: string, scenario: string, region: string = 'us-east-1'): Promise<number> {
    const scenarios: { [key: string]: { [key: string]: { [key: string]: number } } } = {
      // EC2 scenarios
      'ec2': {
        't3.micro': { 'Hours': 24 * 30 },
        't3.small': { 'Hours': 24 * 30 },
        't3.medium': { 'Hours': 24 * 30 },
        'm5.large': { 'Hours': 24 * 30 }
      },
      
      // S3 scenarios
      's3': {
        'low': { 'TimedStorage-ByteHrs': 1 * 24 * 30, 'Requests-Tier1': 10000 },
        'medium': { 'TimedStorage-ByteHrs': 10 * 24 * 30, 'Requests-Tier1': 100000 },
        'high': { 'TimedStorage-ByteHrs': 100 * 24 * 30, 'Requests-Tier1': 1000000 }
      },
      
      // Lambda scenarios
      'lambda': {
        'low': { 'Requests': 100000, 'Duration': 100 },
        'medium': { 'Requests': 1000000, 'Duration': 200 },
        'high': { 'Requests': 10000000, 'Duration': 500 }
      },
      
      // CloudFront scenarios
      'cloudfront': {
        'low': { 'Requests': 1000000, 'DataTransfer-Out-Bytes': 10 * 1024 * 1024 * 1024 },
        'medium': { 'Requests': 10000000, 'DataTransfer-Out-Bytes': 100 * 1024 * 1024 * 1024 },
        'high': { 'Requests': 100000000, 'DataTransfer-Out-Bytes': 1000 * 1024 * 1024 * 1024 }
      },
      
      // ElastiCache scenarios
      'elasticache': {
        'cache.t3.micro': { 'Hours': 24 * 30 },
        'cache.t3.small': { 'Hours': 24 * 30 },
        'cache.m5.large': { 'Hours': 24 * 30 }
      },
      
      // WAF scenarios
      'waf': {
        'low': { 'Requests': 1000000 },
        'medium': { 'Requests': 10000000 },
        'high': { 'Requests': 100000000 }
      }
    };

    const serviceScenarios = scenarios[serviceName.toLowerCase()];
    if (!serviceScenarios || !serviceScenarios[scenario]) {
      console.warn(`[Dynamic Pricing] Unknown scenario: ${serviceName} - ${scenario}`);
      return 0;
    }

    return await this.calculateMonthlyCost(serviceName, serviceScenarios[scenario], region);
  }

  // Get cache status
  getCacheStatus(): { totalServices: number; validEntries: number; expiredEntries: number } {
    let totalServices = 0;
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [serviceName, regions] of Object.entries(this.cache)) {
      for (const [region, usageTypes] of Object.entries(regions)) {
        totalServices++;
        if (this.isCacheValid(serviceName, region)) {
          validEntries++;
        } else {
          expiredEntries++;
        }
      }
    }

    return { totalServices, validEntries, expiredEntries };
  }

  // Clear expired cache entries
  clearExpiredCache(): void {
    for (const [serviceName, regions] of Object.entries(this.cache)) {
      for (const [region] of Object.entries(regions)) {
        if (!this.isCacheValid(serviceName, region)) {
          delete this.cache[serviceName][region];
        }
      }
      // Remove empty service entries
      if (Object.keys(this.cache[serviceName]).length === 0) {
        delete this.cache[serviceName];
      }
    }
  }
}

// Export singleton instance
export const dynamicPricingService = new DynamicPricingService(); 