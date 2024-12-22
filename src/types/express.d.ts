import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: any; // 필요에 따라 타입을 명확히 지정 (예: `{ id: string; email: string }`)
    }
  }
}
