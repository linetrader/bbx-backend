// src/main.ts

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 환경 변수로 환경 구분
  const isDevelopment = process.env.NODE_ENV === 'development';

  const frontendUrl = process.env.FRONTEND_URL || '*'; // FRONTEND_URL 환경 변수 가져오기

  // CORS 설정
  app.enableCors({
    origin: isDevelopment ? '*' : frontendUrl, // 개발 환경에서는 모든 도메인 허용
    credentials: true, // 쿠키 및 인증정보 포함 허용
    methods: ['GET', 'POST', 'OPTIONS'], // 허용할 메소드
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
  });

  // Preflight 요청 처리
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') {
      res.header(
        'Access-Control-Allow-Origin',
        isDevelopment ? '*' : frontendUrl,
      );
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, Accept, Origin',
      );
      res.status(204).end(); // 상태 코드 204(No Content)로 응답 종료
      return;
    }
    next();
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Server is running on port ${port}`);
}

bootstrap();
