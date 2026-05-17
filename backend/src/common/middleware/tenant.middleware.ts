import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage allows storing request-specific context (like tenantId) 
// without passing it manually through every function argument
export const tenantStorage = new AsyncLocalStorage<string>();

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 1. Check custom header (e.g. from Flutter/NextJS) or JWT
    const tenantId = req.headers['x-tenant-id'] as string || (req as any).user?.tenantId;
    
    if (tenantId) {
      tenantStorage.run(tenantId, () => next());
    } else {
      next();
    }
  }
}
