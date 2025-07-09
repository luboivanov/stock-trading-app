import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module'; // Import the HealthModule to include health checks
import { LoggerMiddleware } from './logger.middleware';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60, // time to live in seconds
      limit: 30, // max requests per IP per ttl
    }),
    PrometheusModule.register(),
    HealthModule
  ], // Add ThrottlerModule, PrometheusModule and HealthModule to imports
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
