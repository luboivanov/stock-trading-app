import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api'); // Add global API prefix so /api/health works

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
