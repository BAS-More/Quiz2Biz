import { Module, DynamicModule, Type } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { buildLoggerConfig } from './config/logger.config';
import { CsrfGuard } from './common/guards/csrf.guard';
import { PrismaModule } from '@libs/database';
import { RedisModule } from '@libs/redis';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { QuestionnaireModule } from './modules/questionnaire/questionnaire.module';
import { SessionModule } from './modules/session/session.module';
import { AdaptiveLogicModule } from './modules/adaptive-logic/adaptive-logic.module';
import { StandardsModule } from './modules/standards/standards.module';
import { AdminModule } from './modules/admin/admin.module';
import { DocumentGeneratorModule } from './modules/document-generator/document-generator.module';
import { ScoringEngineModule } from './modules/scoring-engine/scoring-engine.module';
import { HeatmapModule } from './modules/heatmap/heatmap.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { PaymentModule } from './modules/payment/payment.module';
import { AdaptersModule } from './modules/adapters/adapters.module';
import { IdeaCaptureModule } from './modules/idea-capture/idea-capture.module';
import { AiGatewayModule } from './modules/ai-gateway/ai-gateway.module';
import { ChatEngineModule } from './modules/chat-engine/chat-engine.module';
import { FactExtractionModule } from './modules/fact-extraction/fact-extraction.module';
import { QualityScoringModule } from './modules/quality-scoring/quality-scoring.module';
import { HealthController } from './health.controller';
import configuration from './config/configuration';

/**
 * Conditionally load legacy modules behind feature flag.
 * Set ENABLE_LEGACY_MODULES=true to enable Evidence Registry, Decision Log, QPG, and Policy Pack.
 */
function getLegacyModules(): Array<Type | DynamicModule> {
  if (process.env.ENABLE_LEGACY_MODULES === 'true') {
    const {
      EvidenceRegistryModule,
    } = require('./modules/evidence-registry/evidence-registry.module');
    const { DecisionLogModule } = require('./modules/decision-log/decision-log.module');
    const { QpgModule } = require('./modules/qpg/qpg.module');
    const { PolicyPackModule } = require('./modules/policy-pack/policy-pack.module');

    return [EvidenceRegistryModule, DecisionLogModule, QpgModule, PolicyPackModule];
  }
  return [];
}

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '.env.local'],
    }),

    // Structured logging (Pino)
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildLoggerConfig(config),
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Database
    PrismaModule,

    // Cache
    RedisModule,

    // Core feature modules
    AuthModule,
    UsersModule,
    QuestionnaireModule,
    SessionModule,
    AdaptiveLogicModule,
    StandardsModule,
    AdminModule,
    DocumentGeneratorModule,
    ScoringEngineModule,
    HeatmapModule,
    NotificationModule,
    PaymentModule,
    AdaptersModule,
    IdeaCaptureModule,
    AiGatewayModule,
    ChatEngineModule,
    FactExtractionModule,
    QualityScoringModule,

    // Legacy modules (feature-flagged via ENABLE_LEGACY_MODULES env var)
    ...getLegacyModules(),
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule {}
