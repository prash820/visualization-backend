import { validateAuthToken } from '../utils/validation';

interface AuthResponse {
  isValid: boolean;
  userId?: string;
  error?: string;
}

export class AuthService {
  async validateToken(token: string): Promise<AuthResponse> {
    try {
      const isValid = validateAuthToken(token);
      if (!isValid) {
        return { isValid: false, error: 'Invalid token' };
      }
      // Simulate token decoding to get userId
      const userId = this.decodeToken(token);
      return { isValid: true, userId };
    } catch (error: any) {
      return { isValid: false, error: error.message || 'Token validation failed' };
    }
  }

  private decodeToken(token: string): string {
    // Simulate decoding logic
    return 'decodedUserId';
  }
}

export default new AuthService();