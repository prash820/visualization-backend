import { APIGatewayProxyEvent } from 'aws-lambda';

export function validateExpressionInput(event: APIGatewayProxyEvent): boolean {
  try {
    const body = JSON.parse(event.body || '{}');
    if (typeof body.expression !== 'string' || body.expression.trim() === '') {
      return false;
    }
    return true;
  } catch (error: any) {
    if (error.message) {
      console.error('Error parsing input:', error.message);
    }
    return false;
  }
}

export function validateAuthToken(token: string): boolean {
  try {
    if (typeof token !== 'string' || token.trim() === '') {
      return false;
    }
    // Add additional token validation logic here if needed
    return true;
  } catch (error: any) {
    if (error.message) {
      console.error('Error validating token:', error.message);
    }
    return false;
  }
}

export function validateScientificInput(event: APIGatewayProxyEvent): boolean {
  try {
    const body = JSON.parse(event.body || '{}');
    if (typeof body.expression !== 'string' || body.expression.trim() === '') {
      return false;
    }
    if (typeof body.scientificOption !== 'string' || body.scientificOption.trim() === '') {
      return false;
    }
    return true;
  } catch (error: any) {
    if (error.message) {
      console.error('Error parsing scientific input:', error.message);
    }
    return false;
  }
}