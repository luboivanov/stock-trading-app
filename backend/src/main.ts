import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
  });
  app.enableCors();
  app.setGlobalPrefix('api'); // Add global API prefix so /api/health works

  // Trust proxy headers for real client IP (for rate limiting, logging, etc.)
  app.set('trust proxy', true);

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
