import { UMLIntermediateRepresentation, GlobalSymbolTable, GlobalSymbolTableManager } from '../codeGenerationEngine';

export class SymbolTableManager {
  async initializeSymbolTable(representation: UMLIntermediateRepresentation): Promise<GlobalSymbolTable> {
    console.log('[SymbolTableManager] Initializing global symbol table');
    
    const globalSymbolTableManager = new GlobalSymbolTableManager(representation);
    return await globalSymbolTableManager.initializeSymbolTable();
  }
} 