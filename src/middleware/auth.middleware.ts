/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    //console.log('authHeader : ', authHeader);

    if (!authHeader) {
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
      return next();
    } catch (err) {
      return res
        .status(401)
        .json({ message: 'Unauthorized: Invalid or expired token.' });
    }
  }
}
