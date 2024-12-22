// src/main.ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:4000', // Next.js 클라이언트 주소
    credentials: true, // 쿠키/헤더 등 자격 증명 허용
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
