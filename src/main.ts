import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", process.env.CORS_ORIGIN || 'http://localhost:5173'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Configure CORS: support comma-separated origins in CORS_ORIGIN
  const corsEnv = process.env.CORS_ORIGIN || '';
  const allowedOrigins = corsEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const isDev = process.env.NODE_ENV !== 'production';

  if (!allowedOrigins.length && !isDev) {
    logger.warn(
      'CORS_ORIGIN is not set in production. CORS will reject all cross-origin requests.',
    );
  }

  app.enableCors({
    origin: allowedOrigins.length
      ? allowedOrigins
      : isDev
        ? ['http://localhost:5173', 'http://localhost:3000']
        : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('SERVCTL API')
    .setDescription('Server Control Panel SaaS API Documentation')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('servers', 'Server management endpoints')
    .addTag('keys', 'SSH key vault endpoints')
    .addTag('network', 'Network detection endpoints')
    .addTag('config', 'Runtime config and feature flags')
    .addTag('deploy', 'Deployment management endpoints')
    .addTag('logs', 'Server log retrieval endpoints')
    .addTag('quick-commands', 'Terminal quick command management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
    },
  });

  // Enable graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port, () => {
    logger.log(`Server running on port ${port}`);
    logger.log(
      `Swagger documentation available at http://localhost:${port}/api/docs`,
    );
  });
}

bootstrap().catch((error) => {
  console.error('Bootstrap error:', error);
  process.exit(1);
});
