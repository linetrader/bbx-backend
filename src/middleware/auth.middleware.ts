/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // console.log(
    //   'AuthMiddleware - Incoming Authorization Header:',
    //   req.headers.authorization,
    // );

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.warn('No Authorization header found');
      req.user = undefined;
      return next();
    }

    //console.log('AuthMiddleware - Incoming Authorization Header');

    if (authHeader === 'login') {
      req.user = { mode: 'login' };
      return next();
    }

    try {
      const token = authHeader.split(' ')[1];
      const decoded = this.jwtService.verify(token) as {
        id: string;
        email: string;
      };
      req.user = decoded;
      return next();
    } catch (err) {
      //console.error('AuthMiddleware - JWT verification failed:', err.message);
      // JWT 검증 실패 시 응답을 종료
      return res.status(401).json({ message: 'Unauthorized' });
    }
  }
}
