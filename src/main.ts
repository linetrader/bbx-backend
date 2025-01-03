// src/main.ts

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Request, Response, NextFunction } from 'express'; // 타입 가져오기

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정
  app.enableCors({
    origin: ['https://bitboost-x.com'], // 클라이언트 도메인 명시
    credentials: true, // 쿠키 및 인증정보 포함 허용
    methods: ['POST', 'OPTIONS'], // 허용할 메소드
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
  });

  // Preflight 요청 처리 미들웨어 추가
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') {
      // Preflight 요청에 대한 응답 헤더 설정
      res.header('Access-Control-Allow-Origin', 'https://bitboost-x.com');
      res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, Accept, Origin',
      );
      res.status(200).end(); // 200 상태로 응답
    } else {
      next(); // 다른 요청은 다음 미들웨어로 전달
    }
  });

  const port = process.env.PORT ?? 3000;
  //console.log(`Server is running on port ${port}`);
  await app.listen(port);
}

bootstrap();
