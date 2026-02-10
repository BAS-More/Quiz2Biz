// Initialize Application Insights FIRST (before any other imports)
// This ensures proper instrumentation of all dependencies
import {
  initializeAppInsights,
  shutdown as shutdownAppInsights,
  createRequestTrackingMiddleware,
} from './config/appinsights.config';
initializeAppInsights();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { initializeSentry, captureException } from './config/sentry.config';

// Initialize Sentry after Application Insights
initializeSentry();

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Security middleware with CSP configuration for React SPA
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            // Allow scripts from same origin and inline scripts for React
            nodeEnv === 'development' ? "'unsafe-inline'" : "'self'",
            // Google Analytics, Stripe, etc.
            'https://www.googletagmanager.com',
            'https://www.google-analytics.com',
            'https://js.stripe.com',
          ].filter(Boolean),
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required for React styled-components/emotion
            'https://fonts.googleapis.com',
          ],
          imgSrc: [
            "'self'",
            'data:',
            'blob:',
            'https://www.googletagmanager.com',
            'https://www.google-analytics.com',
            'https://*.stripe.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          connectSrc: [
            "'self'",
            'https://www.google-analytics.com',
            'https://api.stripe.com',
            'https://dc.services.visualstudio.com', // Application Insights
            'wss:', // WebSocket for real-time features
          ],
          frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          upgradeInsecureRequests: nodeEnv === 'production' ? [] : null,
        },
      },
      // HSTS for production
      strictTransportSecurity:
        nodeEnv === 'production'
          ? {
              maxAge: 31536000, // 1 year
              includeSubDomains: true,
              preload: true,
            }
          : false,
    }),
  );

  // Permissions-Policy header (formerly Feature-Policy)
  // Restricts which browser features the site can use
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Permissions-Policy',
      [
        // Disable potentially dangerous features
        'accelerometer=()',
        'ambient-light-sensor=()',
        'autoplay=()',
        'battery=()',
        'browsing-topics=()',
        'camera=()',
        'display-capture=()',
        'document-domain=()',
        'encrypted-media=()',
        'execution-while-not-rendered=()',
        'execution-while-out-of-viewport=()',
        'gamepad=()',
        'geolocation=()',
        'gyroscope=()',
        'hid=()',
        'identity-credentials-get=()',
        'idle-detection=()',
        'local-fonts=()',
        'magnetometer=()',
        'microphone=()',
        'midi=()',
        'otp-credentials=()',
        'payment=(self)', // Allow Stripe payment
        'picture-in-picture=()',
        'publickey-credentials-create=()',
        'publickey-credentials-get=()',
        'screen-wake-lock=()',
        'serial=()',
        'speaker-selection=()',
        'storage-access=()',
        'usb=()',
        'web-share=()',
        'xr-spatial-tracking=()',
      ].join(', '),
    );
    next();
  });

  // Application Insights request tracking
  app.use(createRequestTrackingMiddleware());

  // Cookie parser for CSRF tokens
  app.use(cookieParser());

  // CORS configuration
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global prefix (exclude health endpoints for container probes)
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['health', 'health/live', 'health/ready'],
  });

  // Global pipes
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

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor(), new LoggingInterceptor());

  // Swagger/OpenAPI documentation - available in all environments
  // Production APIs benefit from self-documenting endpoints
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Quiz2Biz API')
    .setDescription(
      `## Adaptive Questionnaire System API
      
This API powers the Quiz2Biz platform - an intelligent assessment tool for organizational readiness.

### Features
- **Authentication**: JWT-based auth with OAuth2 support (Google, Microsoft)
- **Questionnaires**: Adaptive questionnaire flow with 11 question types
- **Scoring**: Real-time readiness scoring across 11 dimensions
- **Documents**: Automated document generation (Technology Roadmap, Business Plan, etc.)
- **Evidence**: Evidence collection and integrity verification

### Rate Limits
- 100 requests per minute per IP
- 1000 requests per hour per authenticated user

### Support
For API issues, contact: support@quiz2biz.com`,
    )
    .setVersion('1.0.0')
    .setContact('Quiz2Biz Team', 'https://quiz2biz.com', 'support@quiz2biz.com')
    .setLicense('Proprietary', 'https://quiz2biz.com/terms')
    .addServer(
      nodeEnv === 'production' ? 'https://api.quiz2biz.com' : `http://localhost:${port}`,
      nodeEnv === 'production' ? 'Production' : 'Development',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication & authorization endpoints')
    .addTag('users', 'User profile management')
    .addTag('questionnaires', 'Questionnaire templates and management')
    .addTag('sessions', 'Assessment sessions and progress')
    .addTag('responses', 'Question responses and validation')
    .addTag('scoring', 'Readiness scoring and heatmaps')
    .addTag('evidence', 'Evidence collection and verification')
    .addTag('documents', 'Document generation and export')
    .addTag('admin', 'Administrative operations')
    .addTag('payment', 'Subscription and billing')
    .addTag('health', 'Health check endpoints')
    .build();

  const openApiDocument = SwaggerModule.createDocument(app, swaggerConfig, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  // Set up Swagger UI at /api/v1/docs
  SwaggerModule.setup(`${apiPrefix}/docs`, app, openApiDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
    },
    customSiteTitle: 'Quiz2Biz API Documentation',
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { font-size: 2rem; }
    `,
  });

  logger.log(`Swagger documentation available at /${apiPrefix}/docs`);

  // Graceful shutdown
  app.enableShutdownHooks();

  // Handle graceful shutdown for Application Insights
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, flushing telemetry...');
    await shutdownAppInsights();
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT received, flushing telemetry...');
    await shutdownAppInsights();
  });

  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`Environment: ${nodeEnv}`);
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application', error);
  console.error('Full stack trace:', error.stack);

  // Capture bootstrap errors in Sentry
  captureException(error, { context: 'bootstrap' });

  process.exit(1);
});
