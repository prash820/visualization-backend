import jwt from 'jsonwebtoken';

interface TokenPayload {
  userId: string;
  email: string;
}

export class AuthService {
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.JWT_SECRET_KEY || '';
  }

  public async validateToken(token: string): Promise<TokenPayload> {
    try {
      if (!token) {
        throw new Error('Token is required');
      }

      const decoded = jwt.verify(token, this.secretKey) as TokenPayload;
      return decoded;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw new Error(error.message || 'Token validation failed');
      }
    }
  }
}

export default new AuthService();