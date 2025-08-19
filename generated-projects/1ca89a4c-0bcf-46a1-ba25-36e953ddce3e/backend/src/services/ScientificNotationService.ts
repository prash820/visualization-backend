export class ScientificNotationService {
  convertToScientificNotation(number: number): string {
    try {
      if (typeof number !== 'number') {
        throw new Error('Input must be a number');
      }
      return number.toExponential();
    } catch (error: any) {
      if (error.message) {
        throw new Error(`Conversion error: ${error.message}`);
      }
      throw new Error('Unknown conversion error');
    }
  }

  convertFromScientificNotation(scientificNotation: string): number {
    try {
      const number = Number(scientificNotation);
      if (isNaN(number)) {
        throw new Error('Input must be a valid scientific notation string');
      }
      return number;
    } catch (error: any) {
      if (error.message) {
        throw new Error(`Conversion error: ${error.message}`);
      }
      throw new Error('Unknown conversion error');
    }
  }
}

export default new ScientificNotationService();