import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    res.on('finish', () => {
      const { statusCode } = res;
      this.logger.log(`${method} ${originalUrl} ${statusCode} - ${ip}`);
    });
    next();
  }
}
