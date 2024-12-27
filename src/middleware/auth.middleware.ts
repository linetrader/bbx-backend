/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';

// interface ExtendedUser {
//   id?: string;
//   email?: string;
//   mode?: string;
// }

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    //console.log('AuthMiddleware - authHeader:', authHeader);

    if (!authHeader) {
      console.warn('No Authorization header found');
      req.user = undefined;
      return next();
    }

    try {
      const token = authHeader.split(' ')[1];
      const decoded = this.jwtService.verify(token) as {
        id: string;
        email: string;
      };
      req.user = decoded;
      //console.log('AuthMiddleware - Decoded JWT:', decoded);
    } catch (err) {
      //console.error('AuthMiddleware - JWT verification failed:', err);
      req.user = undefined;
    }
    next();
  }
}
