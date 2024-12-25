// src/types/express.d.ts
import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id?: string; // 선택적으로 변경
        email?: string; // 선택적으로 변경
        mode?: string;
      };
    }
  }
}
