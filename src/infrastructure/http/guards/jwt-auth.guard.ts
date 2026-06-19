import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractTokenFromHeaderOrCookie(request);

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    try {
      // First try to get from mapped config, fallback to raw env
      const secret = this.configService.get<string>('env.jwtAccessSecret') || this.configService.get<string>('JWT_ACCESS_SECRET');
      if (!secret) {
        throw new Error('JWT_ACCESS_SECRET is not configured');
      }

      const payload = jwt.verify(token, secret) as JwtPayload;
      
      // Store payload in request for later use in controllers
      // FastifyRequest requires us to extend it or just cast it
      (request as any).user = payload;
      
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeaderOrCookie(request: FastifyRequest): string | undefined {
    // Check cookie first
    const cookieToken = (request as any).cookies?.accessToken;
    if (cookieToken) {
      return cookieToken;
    }

    // Fallback to Bearer token
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
