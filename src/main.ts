// src/main.ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
//import * as cookieParser from 'cookie-parser';
import cookieParser from 'cookie-parser';
import { Request, Response, NextFunction } from 'express'; // express 타입 가져오기

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: [
      'http://localhost:4000',
      'http://43.201.103.77:4000',
      'http://43.201.103.77',
      'https://bitboost-x.com',
      'https://bitboost-x.com/graphql',
    ], // 허용할 도메인/IP 추가
    credentials: true, // 쿠키/헤더 등 자격 증명 허용
    allowedHeaders: ['Content-Type', 'Authorization'], // 허용할 헤더
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    // console.log('req : ', req, '--res : ');
    // res.cookie('key', 'value', {
    //   httpOnly: true,
    //   secure: true, // HTTPS에서만 작동
    //   sameSite: 'none', // 클라이언트-서버 간 쿠키 허용
    // });
    next();
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
