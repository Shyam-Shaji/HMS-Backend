import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule,{cors: false});
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') || 3000;
  const apiPrefix = config.get<string>('API_PREFIX') || 'api';
  const nodeEnv = config.get<string>('NODE_ENV') || 'development';
  const corsOrigin = config.get<string>('CORS_ORIGIN') || '*';

  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Strips unknown properties, rejects extra fields, auto-transforms
  // payloads to DTO types - this is the single valiation gate for every
  // request body across the whole API.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true},
    }),
  );

  app.setGlobalPrefix(apiPrefix, { exclude: ['/', 'health'] });

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Hospital Management System API')
      .setDescription('Multi-tenancy HMS backend - Foundation phase (auth, user, hospitals)')
      .setVersion('0.1')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(port);
  console.log(`HMS backend running on http://localhost:${port}/${apiPrefix}`);
  if (nodeEnv !== 'production') {
    console.log(`Swagger doc at http://localhost:${port}/docs`);
  }
}
bootstrap();
