import AWS from 'aws-sdk';
import fs from 'fs/promises';
import path from 'path';

// AWS Pricing API client
const pricingClient = new AWS.Pricing({
  region: 'us-east-1', // Pricing API is only available in us-east-1
  apiVersion: '2017-10-15'
});

// Cache file path
const CACHE_FILE = path.join(__dirname, '../../data/aws-pricing-cache.json');
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

interface AWSPricingCache {
  lastUpdated: string;
  prices: {
    [service: string]: {
      [region: string]: {
        [instanceType: string]: {
          [usageType: string]: number;
        };
      };
    };
  };
}

interface PricingRequest {
  serviceCode: string;
  filters: AWS.Pricing.Filter[];
}

// Common AWS services we use (expanded list)
const AWS_SERVICES = {
  EC2: 'AmazonEC2',
  S3: 'AmazonS3',
  LAMBDA: 'AWSLambda',
  DYNAMODB: 'AmazonDynamoDB',
  RDS: 'AmazonRDS',
  API_GATEWAY: 'AmazonApiGateway',
  CLOUDFRONT: 'AmazonCloudFront',
  ROUTE53: 'AmazonRoute53',
  ELASTICACHE: 'AmazonElastiCache',
  ELASTIC_BEANSTALK: 'AWSElasticBeanstalk',
  AURORA: 'AmazonAurora',
  ECS: 'AmazonECS',
  EKS: 'AmazonEKS',
  ECR: 'AmazonECR',
  SQS: 'AmazonSQS',
  SNS: 'AmazonSNS',
  SES: 'AmazonSES',
  CLOUDWATCH: 'AmazonCloudWatch',
  IAM: 'AWSIdentityandAccessManagement',
  KMS: 'AWSSystemsManager',
  SECRETS_MANAGER: 'AWSSecretsManager',
  PARAMETER_STORE: 'AWSSystemsManager',
  VPC: 'AmazonVPC',
  ELB: 'AWSElasticLoadBalancing',
  ALB: 'AWSElasticLoadBalancing',
  NLB: 'AWSElasticLoadBalancing',
  GATEWAY_LOAD_BALANCER: 'AWSElasticLoadBalancing',
  NAT_GATEWAY: 'AmazonVPC',
  INTERNET_GATEWAY: 'AmazonVPC',
  VPC_ENDPOINT: 'AmazonVPC',
  DIRECT_CONNECT: 'AWSDirectConnect',
  VPN: 'AmazonVPC',
  WAF: 'AWSWAF',
  SHIELD: 'AWSShield',
  GUARDDUTY: 'AmazonGuardDuty',
  CONFIG: 'AWSConfig',
  CLOUDTRAIL: 'AWSCloudTrail',
  BACKUP: 'AWSBackup',
  STORAGE_GATEWAY: 'AWSStorageGateway',
  FSX: 'AmazonFSx',
  EFS: 'AmazonEFS',
  GLACIER: 'AmazonS3Glacier',
  REDSHIFT: 'AmazonRedshift',
  EMR: 'AmazonElasticMapReduce',
  ATHENA: 'AmazonAthena',
  GLUE: 'AWSGlue',
  QUICKSIGHT: 'AmazonQuickSight',
  SAGEMAKER: 'AmazonSageMaker',
  COMPREHEND: 'AmazonComprehend',
  TRANSLATE: 'AmazonTranslate',
  REKOGNITION: 'AmazonRekognition',
  TEXTTRACT: 'AmazonTextract',
  LEX: 'AmazonLex',
  POLLY: 'AmazonPolly',
  TRANSCRIBE: 'AmazonTranscribe',
  CONNECT: 'AmazonConnect',
  CHIME: 'AmazonChime',
  WORKSPACES: 'AmazonWorkSpaces',
  APPSTREAM: 'AmazonAppStream',
  LIGHTSAIL: 'AmazonLightsail',
  OPSWORKS: 'AWSOpsWorks',
  CODEBUILD: 'AWSCodeBuild',
  CODEPIPELINE: 'AWSCodePipeline',
  CODECOMMIT: 'AWSCodeCommit',
  CODEDEPLOY: 'AWSCodeDeploy',
  CLOUDFORMATION: 'AWSCloudFormation',
  SAM: 'AWSServerlessApplicationRepository',
  STEP_FUNCTIONS: 'AWSStepFunctions',
  EVENTBRIDGE: 'AmazonEventBridge',
  MQ: 'AmazonMQ',
  KINESIS: 'AmazonKinesis',
  FIREHOSE: 'AmazonKinesisFirehose',
  ANALYTICS: 'AmazonKinesisAnalytics',
  DATA_STREAMS: 'AmazonKinesisDataStreams',
  VIDEO_STREAMS: 'AmazonKinesisVideoStreams',
  ELASTICSEARCH: 'AmazonElasticsearchService',
  OPENSEARCH: 'AmazonOpenSearchService',
  DOCUMENTDB: 'AmazonDocumentDB',
  NEPTUNE: 'AmazonNeptune',
  QLDB: 'AmazonQLDB',
  TIMESTREAM: 'AmazonTimestream',
  MANAGED_BLOCKCHAIN: 'AmazonManagedBlockchain',
  IOT_CORE: 'AWSIoT',
  IOT_ANALYTICS: 'AWSIoTAnalytics',
  IOT_DEVICE_DEFENDER: 'AWSIoTDeviceDefender',
  IOT_DEVICE_MANAGEMENT: 'AWSIoTDeviceManagement',
  IOT_SITE_WISE: 'AWSIoTSiteWise',
  IOT_THINGS_GRAPH: 'AWSIoTThingsGraph',
  GREENGRASS: 'AWSIoTGreengrass',
  FREE_RTOS: 'AmazonFreeRTOS',
  ROBOMAKER: 'AWSRoboMaker',
  DEEPRACER: 'AWSDeepRacer',
  GROUND_TRUTH: 'AmazonSageMakerGroundTruth',
  DATA_EXCHANGE: 'AWSDataExchange',
  MARKETPLACE: 'AWSMarketplace',
  MARKETPLACE_METERING: 'AWSMarketplaceMetering',
  MARKETPLACE_CATALOG: 'AWSMarketplaceCatalog',
  MARKETPLACE_ENTITLEMENT: 'AWSMarketplaceEntitlement',
  MARKETPLACE_IMAGE_BUILDING: 'AWSMarketplaceImageBuilding',
  MARKETPLACE_PROCUREMENT: 'AWSMarketplaceProcurement',
  MARKETPLACE_SELLER: 'AWSMarketplaceSeller',
  MARKETPLACE_VENDOR: 'AWSMarketplaceVendor'
};

// Common regions
const AWS_REGIONS = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];

export class AWSPricingService {
  private cache: AWSPricingCache | null = null;

  constructor() {
    this.loadCache();
  }

  private async loadCache(): Promise<void> {
    try {
      const cacheData = await fs.readFile(CACHE_FILE, 'utf-8');
      this.cache = JSON.parse(cacheData);
      
      // Check if cache is still valid
      if (this.cache) {
        const lastUpdated = new Date(this.cache.lastUpdated).getTime();
        if (Date.now() - lastUpdated > CACHE_DURATION) {
          console.log('[AWS Pricing] Cache expired, refreshing...');
          await this.refreshPricing();
        }
      }
    } catch (error) {
      console.log('[AWS Pricing] No cache found, fetching fresh pricing...');
      await this.refreshPricing();
    }
  }

  private async saveCache(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
      await fs.writeFile(CACHE_FILE, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.error('[AWS Pricing] Failed to save cache:', error);
    }
  }

  async refreshPricing(): Promise<void> {
    console.log('[AWS Pricing] Starting pricing refresh...');
    
    this.cache = {
      lastUpdated: new Date().toISOString(),
      prices: {}
    };

    // Fetch pricing for each service
    for (const [serviceKey, serviceCode] of Object.entries(AWS_SERVICES)) {
      console.log(`[AWS Pricing] Fetching ${serviceKey} pricing...`);
      await this.fetchServicePricing(serviceCode, serviceKey);
    }

    await this.saveCache();
    console.log('[AWS Pricing] Pricing refresh completed');
  }

  private async fetchServicePricing(serviceCode: string, serviceKey: string): Promise<void> {
    try {
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

      // Add service-specific filters
      switch (serviceCode) {
        case AWS_SERVICES.EC2:
          filters.push(
            { Type: 'TERM_MATCH', Field: 'Tenancy', Value: 'Shared' },
            { Type: 'TERM_MATCH', Field: 'OperatingSystem', Value: 'Linux' },
            { Type: 'TERM_MATCH', Field: 'CapacityStatus', Value: 'Used' }
          );
          break;
        case AWS_SERVICES.S3:
          filters.push(
            { Type: 'TERM_MATCH', Field: 'VolumeType', Value: 'General Purpose' }
          );
          break;
        case AWS_SERVICES.LAMBDA:
          filters.push(
            { Type: 'TERM_MATCH', Field: 'Group', Value: 'AWS-Lambda-Duration' }
          );
          break;
        case AWS_SERVICES.RDS:
          filters.push(
            { Type: 'TERM_MATCH', Field: 'DatabaseEngine', Value: 'MySQL' },
            { Type: 'TERM_MATCH', Field: 'DatabaseEdition', Value: 'Single-AZ' }
          );
          break;
      }

      const response = await pricingClient.getProducts({
        ServiceCode: serviceCode,
        Filters: filters,
        MaxResults: 100
      }).promise();

      if (response.PriceList) {
        this.cache!.prices[serviceKey] = this.parsePricingData(response.PriceList, serviceCode);
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`[AWS Pricing] Failed to fetch ${serviceKey} pricing:`, error);
    }
  }

  private parsePricingData(priceList: string[], serviceCode: string): any {
    const parsedPrices: any = {};

    for (const priceData of priceList) {
      try {
        const price = JSON.parse(priceData);
        const product = price.product;
        const terms = price.terms;

        if (!product || !terms) continue;

        // Extract region
        const region = product.attributes?.region || 'us-east-1';
        if (!parsedPrices[region]) {
          parsedPrices[region] = {};
        }

        // Extract pricing based on service type
        switch (serviceCode) {
          case AWS_SERVICES.EC2:
            this.parseEC2Pricing(parsedPrices[region], product, terms);
            break;
          case AWS_SERVICES.S3:
            this.parseS3Pricing(parsedPrices[region], product, terms);
            break;
          case AWS_SERVICES.LAMBDA:
            this.parseLambdaPricing(parsedPrices[region], product, terms);
            break;
          case AWS_SERVICES.DYNAMODB:
            this.parseDynamoDBPricing(parsedPrices[region], product, terms);
            break;
          case AWS_SERVICES.RDS:
            this.parseRDSPricing(parsedPrices[region], product, terms);
            break;
          case AWS_SERVICES.API_GATEWAY:
            this.parseAPIGatewayPricing(parsedPrices[region], product, terms);
            break;
          default:
            this.parseGenericPricing(parsedPrices[region], product, terms);
        }

      } catch (error) {
        console.error('[AWS Pricing] Failed to parse price data:', error);
      }
    }

    return parsedPrices;
  }

  private parseEC2Pricing(regionPrices: any, product: any, terms: any): void {
    const instanceType = product.attributes?.instanceType;
    if (!instanceType) return;

    if (!regionPrices[instanceType]) {
      regionPrices[instanceType] = {};
    }

    // Extract OnDemand pricing
    const onDemandTerms = terms.OnDemand;
    if (onDemandTerms) {
      const termKey = Object.keys(onDemandTerms)[0];
      const priceDimensions = onDemandTerms[termKey].priceDimensions;
      const priceKey = Object.keys(priceDimensions)[0];
      const pricePerHour = parseFloat(priceDimensions[priceKey].pricePerUnit.USD);
      
      regionPrices[instanceType].onDemand = pricePerHour;
    }
  }

  private parseS3Pricing(regionPrices: any, product: any, terms: any): void {
    const usageType = product.attributes?.usagetype;
    if (!usageType) return;

    if (!regionPrices[usageType]) {
      regionPrices[usageType] = {};
    }

    // Extract pricing for different usage types
    const onDemandTerms = terms.OnDemand;
    if (onDemandTerms) {
      const termKey = Object.keys(onDemandTerms)[0];
      const priceDimensions = onDemandTerms[termKey].priceDimensions;
      const priceKey = Object.keys(priceDimensions)[0];
      const pricePerUnit = parseFloat(priceDimensions[priceKey].pricePerUnit.USD);
      
      regionPrices[usageType].pricePerUnit = pricePerUnit;
    }
  }

  private parseLambdaPricing(regionPrices: any, product: any, terms: any): void {
    const usageType = product.attributes?.usagetype;
    if (!usageType) return;

    if (!regionPrices[usageType]) {
      regionPrices[usageType] = {};
    }

    const onDemandTerms = terms.OnDemand;
    if (onDemandTerms) {
      const termKey = Object.keys(onDemandTerms)[0];
      const priceDimensions = onDemandTerms[termKey].priceDimensions;
      const priceKey = Object.keys(priceDimensions)[0];
      const pricePerUnit = parseFloat(priceDimensions[priceKey].pricePerUnit.USD);
      
      regionPrices[usageType].pricePerUnit = pricePerUnit;
    }
  }

  private parseDynamoDBPricing(regionPrices: any, product: any, terms: any): void {
    const usageType = product.attributes?.usagetype;
    if (!usageType) return;

    if (!regionPrices[usageType]) {
      regionPrices[usageType] = {};
    }

    const onDemandTerms = terms.OnDemand;
    if (onDemandTerms) {
      const termKey = Object.keys(onDemandTerms)[0];
      const priceDimensions = onDemandTerms[termKey].priceDimensions;
      const priceKey = Object.keys(priceDimensions)[0];
      const pricePerUnit = parseFloat(priceDimensions[priceKey].pricePerUnit.USD);
      
      regionPrices[usageType].pricePerUnit = pricePerUnit;
    }
  }

  private parseRDSPricing(regionPrices: any, product: any, terms: any): void {
    const instanceType = product.attributes?.instanceType;
    if (!instanceType) return;

    if (!regionPrices[instanceType]) {
      regionPrices[instanceType] = {};
    }

    const onDemandTerms = terms.OnDemand;
    if (onDemandTerms) {
      const termKey = Object.keys(onDemandTerms)[0];
      const priceDimensions = onDemandTerms[termKey].priceDimensions;
      const priceKey = Object.keys(priceDimensions)[0];
      const pricePerHour = parseFloat(priceDimensions[priceKey].pricePerUnit.USD);
      
      regionPrices[instanceType].onDemand = pricePerHour;
    }
  }

  private parseAPIGatewayPricing(regionPrices: any, product: any, terms: any): void {
    const usageType = product.attributes?.usagetype;
    if (!usageType) return;

    if (!regionPrices[usageType]) {
      regionPrices[usageType] = {};
    }

    const onDemandTerms = terms.OnDemand;
    if (onDemandTerms) {
      const termKey = Object.keys(onDemandTerms)[0];
      const priceDimensions = onDemandTerms[termKey].priceDimensions;
      const priceKey = Object.keys(priceDimensions)[0];
      const pricePerUnit = parseFloat(priceDimensions[priceKey].pricePerUnit.USD);
      
      regionPrices[usageType].pricePerUnit = pricePerUnit;
    }
  }

  private parseGenericPricing(regionPrices: any, product: any, terms: any): void {
    const usageType = product.attributes?.usagetype;
    if (!usageType) return;

    if (!regionPrices[usageType]) {
      regionPrices[usageType] = {};
    }

    const onDemandTerms = terms.OnDemand;
    if (onDemandTerms) {
      const termKey = Object.keys(onDemandTerms)[0];
      const priceDimensions = onDemandTerms[termKey].priceDimensions;
      const priceKey = Object.keys(priceDimensions)[0];
      const pricePerUnit = parseFloat(priceDimensions[priceKey].pricePerUnit.USD);
      
      regionPrices[usageType].pricePerUnit = pricePerUnit;
    }
  }

  // Public methods for getting pricing
  getEC2Price(instanceType: string, region: string = 'us-east-1'): number | null {
    if (!this.cache?.prices.EC2?.[region]?.[instanceType]?.onDemand) {
      return null;
    }
    return this.cache.prices.EC2[region][instanceType].onDemand;
  }

  getS3Price(usageType: string, region: string = 'us-east-1'): number | null {
    if (!this.cache?.prices.S3?.[region]?.[usageType]?.pricePerUnit) {
      return null;
    }
    return this.cache.prices.S3[region][usageType].pricePerUnit;
  }

  getLambdaPrice(usageType: string, region: string = 'us-east-1'): number | null {
    if (!this.cache?.prices.LAMBDA?.[region]?.[usageType]?.pricePerUnit) {
      return null;
    }
    return this.cache.prices.LAMBDA[region][usageType].pricePerUnit;
  }

  getDynamoDBPrice(usageType: string, region: string = 'us-east-1'): number | null {
    if (!this.cache?.prices.DYNAMODB?.[region]?.[usageType]?.pricePerUnit) {
      return null;
    }
    return this.cache.prices.DYNAMODB[region][usageType].pricePerUnit;
  }

  getRDSPrice(instanceType: string, region: string = 'us-east-1'): number | null {
    if (!this.cache?.prices.RDS?.[region]?.[instanceType]?.onDemand) {
      return null;
    }
    return this.cache.prices.RDS[region][instanceType].onDemand;
  }

  getAPIGatewayPrice(usageType: string, region: string = 'us-east-1'): number | null {
    if (!this.cache?.prices.API_GATEWAY?.[region]?.[usageType]?.pricePerUnit) {
      return null;
    }
    return this.cache.prices.API_GATEWAY[region][usageType].pricePerUnit;
  }

  // Calculate monthly costs for common scenarios
  calculateEC2MonthlyCost(instanceType: string, region: string = 'us-east-1'): number {
    const hourlyPrice = this.getEC2Price(instanceType, region);
    if (!hourlyPrice) return 0;
    return hourlyPrice * 24 * 30; // 24 hours * 30 days
  }

  calculateS3MonthlyCost(storageGB: number, requests: number, region: string = 'us-east-1'): number {
    const storagePrice = this.getS3Price('TimedStorage-ByteHrs', region);
    const requestPrice = this.getS3Price('Requests-Tier1', region);
    
    let totalCost = 0;
    if (storagePrice) {
      totalCost += storageGB * storagePrice * 24 * 30; // GB * price per GB-hour * hours per month
    }
    if (requestPrice) {
      totalCost += requests * requestPrice;
    }
    return totalCost;
  }

  calculateLambdaMonthlyCost(requests: number, durationMs: number, region: string = 'us-east-1'): number {
    const requestPrice = this.getLambdaPrice('Requests', region);
    const durationPrice = this.getLambdaPrice('Duration', region);
    
    let totalCost = 0;
    if (requestPrice) {
      totalCost += requests * requestPrice;
    }
    if (durationPrice) {
      const durationSeconds = durationMs / 1000;
      totalCost += requests * durationSeconds * durationPrice;
    }
    return totalCost;
  }

  calculateDynamoDBMonthlyCost(storageGB: number, reads: number, writes: number, region: string = 'us-east-1'): number {
    const storagePrice = this.getDynamoDBPrice('TimedStorage-ByteHrs', region);
    const readPrice = this.getDynamoDBPrice('ReadRequestUnits', region);
    const writePrice = this.getDynamoDBPrice('WriteRequestUnits', region);
    
    let totalCost = 0;
    if (storagePrice) {
      totalCost += storageGB * storagePrice * 24 * 30;
    }
    if (readPrice) {
      totalCost += reads * readPrice;
    }
    if (writePrice) {
      totalCost += writes * writePrice;
    }
    return totalCost;
  }

  calculateRDSMonthlyCost(instanceType: string, region: string = 'us-east-1'): number {
    const hourlyPrice = this.getRDSPrice(instanceType, region);
    if (!hourlyPrice) return 0;
    return hourlyPrice * 24 * 30;
  }

  calculateAPIGatewayMonthlyCost(requests: number, region: string = 'us-east-1'): number {
    const requestPrice = this.getAPIGatewayPrice('Requests', region);
    if (!requestPrice) return 0;
    return requests * requestPrice;
  }

  // Get cache status
  getCacheStatus(): { lastUpdated: string; isValid: boolean } {
    if (!this.cache) {
      return { lastUpdated: 'Never', isValid: false };
    }

    const lastUpdated = new Date(this.cache.lastUpdated).getTime();
    const isValid = Date.now() - lastUpdated < CACHE_DURATION;

    return {
      lastUpdated: this.cache.lastUpdated,
      isValid
    };
  }

  // Force refresh pricing
  async forceRefresh(): Promise<void> {
    console.log('[AWS Pricing] Force refreshing pricing...');
    await this.refreshPricing();
  }

  // On-demand pricing fetch for unknown services
  async getOnDemandPricing(serviceName: string, region: string = 'us-east-1'): Promise<any> {
    try {
      console.log(`[AWS Pricing] Fetching on-demand pricing for ${serviceName}...`);
      
      // Try to find the service code
      const serviceCode = this.findServiceCode(serviceName);
      if (!serviceCode) {
        console.warn(`[AWS Pricing] Unknown service: ${serviceName}`);
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

      const response = await pricingClient.getProducts({
        ServiceCode: serviceCode,
        Filters: filters,
        MaxResults: 50
      }).promise();

      if (response.PriceList) {
        const pricing = this.parseOnDemandPricing(response.PriceList, serviceCode, region);
        
        // Cache this pricing data for future use
        if (!this.cache!.prices[serviceName]) {
          this.cache!.prices[serviceName] = {};
        }
        if (!this.cache!.prices[serviceName][region]) {
          this.cache!.prices[serviceName][region] = {};
        }
        this.cache!.prices[serviceName][region] = pricing;
        
        // Save updated cache
        await this.saveCache();
        
        return pricing;
      }

      return null;
    } catch (error) {
      console.error(`[AWS Pricing] Failed to fetch on-demand pricing for ${serviceName}:`, error);
      return null;
    }
  }

  // Find service code from service name
  private findServiceCode(serviceName: string): string | null {
    // Direct mapping
    const directMapping: { [key: string]: string } = {
      'ec2': 'AmazonEC2',
      's3': 'AmazonS3',
      'lambda': 'AWSLambda',
      'dynamodb': 'AmazonDynamoDB',
      'rds': 'AmazonRDS',
      'apigateway': 'AmazonApiGateway',
      'cloudfront': 'AmazonCloudFront',
      'route53': 'AmazonRoute53',
      'elasticache': 'AmazonElastiCache',
      'elasticbeanstalk': 'AWSElasticBeanstalk',
      'aurora': 'AmazonAurora',
      'ecs': 'AmazonECS',
      'eks': 'AmazonEKS',
      'ecr': 'AmazonECR',
      'sqs': 'AmazonSQS',
      'sns': 'AmazonSNS',
      'ses': 'AmazonSES',
      'cloudwatch': 'AmazonCloudWatch',
      'iam': 'AWSIdentityandAccessManagement',
      'kms': 'AWSSystemsManager',
      'secretsmanager': 'AWSSecretsManager',
      'vpc': 'AmazonVPC',
      'elb': 'AWSElasticLoadBalancing',
      'alb': 'AWSElasticLoadBalancing',
      'nlb': 'AWSElasticLoadBalancing',
      'natgateway': 'AmazonVPC',
      'internetgateway': 'AmazonVPC',
      'vpcendpoint': 'AmazonVPC',
      'directconnect': 'AWSDirectConnect',
      'vpn': 'AmazonVPC',
      'waf': 'AWSWAF',
      'shield': 'AWSShield',
      'guardduty': 'AmazonGuardDuty',
      'config': 'AWSConfig',
      'cloudtrail': 'AWSCloudTrail',
      'backup': 'AWSBackup',
      'storagegateway': 'AWSStorageGateway',
      'fsx': 'AmazonFSx',
      'efs': 'AmazonEFS',
      'glacier': 'AmazonS3Glacier',
      'redshift': 'AmazonRedshift',
      'emr': 'AmazonElasticMapReduce',
      'athena': 'AmazonAthena',
      'glue': 'AWSGlue',
      'quicksight': 'AmazonQuickSight',
      'sagemaker': 'AmazonSageMaker',
      'comprehend': 'AmazonComprehend',
      'translate': 'AmazonTranslate',
      'rekognition': 'AmazonRekognition',
      'textract': 'AmazonTextract',
      'lex': 'AmazonLex',
      'polly': 'AmazonPolly',
      'transcribe': 'AmazonTranscribe',
      'connect': 'AmazonConnect',
      'chime': 'AmazonChime',
      'workspaces': 'AmazonWorkSpaces',
      'appstream': 'AmazonAppStream',
      'lightsail': 'AmazonLightsail',
      'opsworks': 'AWSOpsWorks',
      'codebuild': 'AWSCodeBuild',
      'codepipeline': 'AWSCodePipeline',
      'codecommit': 'AWSCodeCommit',
      'codedeploy': 'AWSCodeDeploy',
      'cloudformation': 'AWSCloudFormation',
      'sam': 'AWSServerlessApplicationRepository',
      'stepfunctions': 'AWSStepFunctions',
      'eventbridge': 'AmazonEventBridge',
      'mq': 'AmazonMQ',
      'kinesis': 'AmazonKinesis',
      'firehose': 'AmazonKinesisFirehose',
      'elasticsearch': 'AmazonElasticsearchService',
      'opensearch': 'AmazonOpenSearchService',
      'documentdb': 'AmazonDocumentDB',
      'neptune': 'AmazonNeptune',
      'qldb': 'AmazonQLDB',
      'timestream': 'AmazonTimestream',
      'managedblockchain': 'AmazonManagedBlockchain',
      'iot': 'AWSIoT',
      'greengrass': 'AWSIoTGreengrass',
      'freertos': 'AmazonFreeRTOS',
      'robomaker': 'AWSRoboMaker',
      'deepracer': 'AWSDeepRacer',
      'dataexchange': 'AWSDataExchange',
      'marketplace': 'AWSMarketplace'
    };

    const normalizedName = serviceName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Check direct mapping
    if (directMapping[normalizedName]) {
      return directMapping[normalizedName];
    }

    // Check AWS_SERVICES mapping
    for (const [key, value] of Object.entries(AWS_SERVICES)) {
      if (key.toLowerCase() === normalizedName || value.toLowerCase().includes(normalizedName)) {
        return value;
      }
    }

    return null;
  }

  // Parse on-demand pricing data
  private parseOnDemandPricing(priceList: string[], serviceCode: string, region: string): any {
    const parsedPrices: any = {};

    for (const priceData of priceList) {
      try {
        const price = JSON.parse(priceData);
        const product = price.product;
        const terms = price.terms;

        if (!product || !terms) continue;

        // Extract region
        const productRegion = product.attributes?.region || 'us-east-1';
        if (productRegion !== region) continue;

        // Extract usage type
        const usageType = product.attributes?.usagetype || 'default';
        
        if (!parsedPrices[usageType]) {
          parsedPrices[usageType] = {};
        }

        // Extract pricing
        const onDemandTerms = terms.OnDemand;
        if (onDemandTerms) {
          const termKey = Object.keys(onDemandTerms)[0];
          const priceDimensions = onDemandTerms[termKey].priceDimensions;
          const priceKey = Object.keys(priceDimensions)[0];
          const pricePerUnit = parseFloat(priceDimensions[priceKey].pricePerUnit.USD);
          
          parsedPrices[usageType].pricePerUnit = pricePerUnit;
          parsedPrices[usageType].unit = priceDimensions[priceKey].unit;
          parsedPrices[usageType].description = priceDimensions[priceKey].description;
        }

      } catch (error) {
        console.error('[AWS Pricing] Failed to parse on-demand price data:', error);
      }
    }

    return parsedPrices;
  }

  // Get pricing for any service (cached or on-demand)
  async getServicePricing(serviceName: string, region: string = 'us-east-1'): Promise<any> {
    // First check cache
    if (this.cache?.prices[serviceName]?.[region]) {
      return this.cache.prices[serviceName][region];
    }

    // If not in cache, fetch on-demand
    return await this.getOnDemandPricing(serviceName, region);
  }

  // Calculate estimated monthly cost for any service
  async calculateServiceMonthlyCost(
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
      console.error(`[AWS Pricing] Failed to calculate monthly cost for ${serviceName}:`, error);
      return 0;
    }
  }

  // Calculate CloudFront monthly cost
  calculateCloudFrontMonthlyCost(requests: number, dataTransferGB: number, region: string = 'us-east-1'): number {
    try {
      // CloudFront pricing (simplified)
      const requestCost = requests * 0.0075 / 10000; // $0.0075 per 10,000 requests
      const dataCost = dataTransferGB * 0.085; // $0.085 per GB
      return requestCost + dataCost;
    } catch (error) {
      console.error('[AWS Pricing] Failed to calculate CloudFront cost:', error);
      return 0;
    }
  }

  // Calculate ElastiCache monthly cost
  calculateElastiCacheMonthlyCost(instanceType: string, region: string = 'us-east-1'): number {
    try {
      // ElastiCache pricing (simplified based on instance type)
      const pricingMap: { [key: string]: number } = {
        'cache.t3.micro': 15.00,
        'cache.t3.small': 30.00,
        'cache.t3.medium': 60.00,
        'cache.m5.large': 150.00,
        'cache.m5.xlarge': 300.00,
        'cache.r5.large': 175.00,
        'cache.r5.xlarge': 350.00
      };
      
      return pricingMap[instanceType] || 30.00; // Default to t3.small pricing
    } catch (error) {
      console.error('[AWS Pricing] Failed to calculate ElastiCache cost:', error);
      return 0;
    }
  }

  // Calculate WAF monthly cost
  calculateWAFMonthlyCost(requests: number, region: string = 'us-east-1'): number {
    try {
      // WAF pricing (simplified)
      const requestCost = requests * 0.60 / 1000000; // $0.60 per 1M requests
      const baseCost = 5.00; // Base cost for WAF
      return baseCost + requestCost;
    } catch (error) {
      console.error('[AWS Pricing] Failed to calculate WAF cost:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const awsPricingService = new AWSPricingService(); 