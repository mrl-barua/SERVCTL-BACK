import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure CORS: support comma-separated origins in CORS_ORIGIN
  const corsEnv = process.env.CORS_ORIGIN || '';
  const allowedOrigins = corsEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const isDev = process.env.NODE_ENV !== 'production';
  app.enableCors({
    origin: allowedOrigins.length
      ? allowedOrigins
      : isDev
        ? true
        : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

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

  // Prisma shutdown hooks
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  const port = process.env.PORT || 3000;
  await app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(
      `Swagger documentation available at http://localhost:${port}/api/docs`,
    );
  });
}

bootstrap().catch((error) => {
  console.error('Bootstrap error:', error);
  process.exit(1);
});
