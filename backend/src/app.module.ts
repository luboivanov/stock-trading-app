import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module'; // Import the HealthModule to include health checks

@Module({
  imports: [HealthModule], // Add HealthModule to imports
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
