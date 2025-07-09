import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { ExpressAdapter } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        }),
      ],
    }),
  });
  app.enableCors();
  app.setGlobalPrefix('api'); // Add global API prefix so /api/health works

  // Trust proxy headers for real client IP (for rate limiting, logging, etc.)
  if (app.getHttpAdapter() instanceof ExpressAdapter) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const instance = app.getHttpAdapter().getInstance();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    instance.set('trust proxy', true);
  }

  // (Optional) Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Stock Trade API')
    .setDescription('Find the best buy/sell times')
    .setVersion('1.0')
    .addTag('trading')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 8000);
  console.log(`🚀 Server running on http://localhost:${process.env.PORT ?? 8000}/api`);
}

void bootstrap();
