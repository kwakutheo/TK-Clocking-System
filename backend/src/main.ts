import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);

  // ── Security ────────────────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ────────────────────────────────────────────────────────────────────
  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  const corsOrigin = config.get<string>('CORS_ORIGIN');

  app.enableCors({
    // In development, reflect the request origin so localhost / 127.0.0.1
    // and any local tunnel work without manual CORS_ORIGIN configuration.
    origin:
      nodeEnv === 'development'
        ? true
        : corsOrigin?.split(',') ?? '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // ── Validation ──────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // strip unknown properties
      transform: true,        // auto-transform DTOs to class instances
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global prefix ───────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Swagger ─────────────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('TK Clocking System API')
    .setDescription('Ghana Workforce Time & Attendance SaaS — REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  console.log(`🚀 TK Clocking API running on http://localhost:${port}/api/v1`);
  console.log(`📖 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
