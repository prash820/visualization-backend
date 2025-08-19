import { openai, OPENAI_MODEL, anthropic, ANTHROPIC_MODEL } from '../config/aiProvider';

export interface ArchitectureOption {
  name: 'cost-optimized' | 'performance-optimized' | 'balanced';
  title: string;
  description: string;
  estimatedCost: number;
  performanceScore: number;
  scalabilityScore: number;
  securityScore: number;
  complexityScore: number;
  tradeoffs: string[];
  recommendations: string[];
  terraformCode: string;
  architectureDiagram: string;
  resourceBreakdown: {
    compute: string[];
    storage: string[];
    database: string[];
    networking: string[];
    security: string[];
  };
}

export interface ArchitectureComparison {
  userPrompt: string;
  options: ArchitectureOption[];
  comparison: {
    costAnalysis: {
      cheapest: string;
      mostExpensive: string;
      costDifference: number;
    };
    performanceAnalysis: {
      fastest: string;
      slowest: string;
      performanceDifference: number;
    };
    recommendation: {
      bestOverall: string;
      bestForStartups: string;
      bestForEnterprise: string;
      reasoning: string;
    };
  };
}

export class ArchitectureRecommendationService {
  
  async getArchitectureRecommendations(prompt: string): Promise<any> {
    console.log('[Architecture] Generating recommendations for:', prompt);

    try {
      // Use AI to generate architecture recommendations
      const recommendations = await this.generateAIArchitectureRecommendations(prompt);
      return recommendations;
    } catch (error) {
      console.error('[Architecture] Failed to generate recommendations:', error);
      throw new Error(`Failed to generate architecture recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateAIArchitectureRecommendations(prompt: string): Promise<any> {
    const systemPrompt = `You are an expert cloud architect and DevOps engineer. Generate comprehensive architecture recommendations for AWS infrastructure based on the user's requirements.

Generate exactly 3 architecture options with the following structure:

1. COST-OPTIMIZED: Serverless-first approach with minimal costs
2. BALANCED: Hybrid approach with good performance/cost balance  
3. PERFORMANCE-OPTIMIZED: High-performance architecture for scale

For each architecture, provide:
- name: short identifier
- title: descriptive title
- description: detailed explanation
- estimatedCost: monthly cost estimate in USD
- performanceScore: 1-10 rating
- scalabilityScore: 1-10 rating
- securityScore: 1-10 rating
- complexityScore: 1-10 rating
- tradeoffs: array of tradeoffs
- recommendations: array of recommendations
- terraformCode: complete, valid Terraform code using AWS provider ~> 5.0
- architectureDiagram: Mermaid flowchart
- resourceBreakdown: object with compute, storage, database, networking, security arrays

CRITICAL TERRAFORM REQUIREMENTS:
- Use AWS provider version ~> 5.0
- Include required_providers block
- For S3: use aws_s3_bucket_ownership_controls (NOT ACLs)
- For Lambda: use nodejs18.x runtime
- Include random_string for unique names
- Add proper IAM roles and policies
- Use skip_final_snapshot = true for RDS
- Include proper tags and security groups

CRITICAL AWS REQUIREMENTS:
- Use AWS provider version "~> 5.0" (latest stable)
- For S3 buckets: Do NOT use bucket_ownership_controls blocks. Do NOT set ACLs. Use simple bucket configuration only.
- For Lambda functions: Use supported runtimes like "nodejs18.x", "nodejs20.x", "python3.9", "python3.10", "python3.11", or "python3.12". Do NOT use deprecated runtimes like "nodejs14.x".
- For API Gateway: Use REST API or HTTP API as appropriate
- For RDS: Use supported engine versions
- Include proper IAM roles and permissions
- Use proper security groups and VPC configurations
- Do NOT use any ownership controls or ACL configurations for S3 buckets

Return valid JSON with the exact structure specified. No markdown formatting.

User Requirements: ${prompt}`;

    // Use OpenAI GPT-4o as primary, Anthropic Claude as fallback
    let response;
    try {
      console.log('[Architecture] Attempting OpenAI request...');
      response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        max_tokens: 4096,
        temperature: 0.3,
        messages: [
          { role: "user", content: systemPrompt }
        ]
      });
      console.log('[Architecture] OpenAI request successful');
    } catch (openaiError: any) {
      console.log('[Architecture] OpenAI failed, trying Anthropic:', openaiError);
      try {
        response = await anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          max_tokens: 4096,
          temperature: 0.3,
          messages: [
            { role: "user", content: systemPrompt }
          ]
        });
        console.log('[Architecture] Anthropic fallback successful');
      } catch (anthropicError: any) {
        console.error('[Architecture] Both AI providers failed:', { openaiError, anthropicError });
        throw new Error(`AI providers failed: ${openaiError?.message || 'OpenAI failed'}, ${anthropicError?.message || 'Anthropic failed'}`);
      }
    }

    // Parse AI response
    let recommendations: any;
    try {
      if ('choices' in response) {
        // OpenAI response
        const content = response.choices[0]?.message?.content;
        recommendations = JSON.parse(content || "{}");
      } else {
        // Anthropic response
        const content = response.content[0]?.type === 'text' ? response.content[0].text : "";
        recommendations = JSON.parse(content);
      }

      // Validate and enhance the response
      return this.validateAndEnhanceRecommendations(recommendations);
    } catch (parseError: any) {
      console.error('[Architecture] Failed to parse AI response:', parseError);
      throw new Error(`Failed to parse architecture recommendations: ${parseError?.message || 'Unknown parsing error'}`);
    }
  }

  private validateAndEnhanceRecommendations(recommendations: any): any {
    // Ensure we have the basic structure
    if (!recommendations.architectures || !Array.isArray(recommendations.architectures)) {
      throw new Error('Invalid architecture recommendations structure');
    }

    // Validate each architecture
    recommendations.architectures.forEach((arch: any, index: number) => {
      if (!arch.name || !arch.title || !arch.terraformCode) {
        throw new Error(`Architecture ${index} missing required fields`);
      }

      // Ensure Terraform code is valid
      if (typeof arch.terraformCode !== 'string' || arch.terraformCode.trim().length === 0) {
        throw new Error(`Architecture ${arch.name} has invalid Terraform code`);
      }
    });

    // Add comparison analysis
    recommendations.comparison = this.generateComparisonAnalysis(recommendations.architectures);

    return recommendations;
  }

  private generateComparisonAnalysis(architectures: any[]): any {
    const costs = architectures.map(a => a.estimatedCost || 0);
    const performances = architectures.map(a => a.performanceScore || 0);

    return {
      costAnalysis: {
        cheapest: architectures[costs.indexOf(Math.min(...costs))]?.name || 'unknown',
        mostExpensive: architectures[costs.indexOf(Math.max(...costs))]?.name || 'unknown',
        costDifference: Math.max(...costs) - Math.min(...costs)
      },
      performanceAnalysis: {
        fastest: architectures[performances.indexOf(Math.max(...performances))]?.name || 'unknown',
        slowest: architectures[performances.indexOf(Math.min(...performances))]?.name || 'unknown',
        performanceDifference: Math.max(...performances) - Math.min(...performances)
      },
      recommendation: {
        bestOverall: 'balanced',
        bestForStartups: 'cost-optimized',
        bestForEnterprise: 'performance-optimized',
        reasoning: 'The balanced option provides the best combination of cost, performance, and maintainability for most applications.'
      }
    };
  }
} 