import { UMLIntermediateRepresentation } from '../codeGenerationEngine';
import { InfrastructureContext } from '../../types/infrastructure';

export class InputProcessor {
  async processInputs(umlDiagrams: any, infrastructureContext: InfrastructureContext): Promise<UMLIntermediateRepresentation> {
    console.log('[InputProcessor] Processing UML diagrams and infrastructure context');
    
    // This will be extracted from the existing InputAggregatorUnit
    // For now, we'll create a placeholder that delegates to the existing implementation
    const inputAggregator = new (require('../codeGenerationEngine').InputAggregatorUnit)();
    return await inputAggregator.aggregateInputs(umlDiagrams, infrastructureContext);
  }
} 