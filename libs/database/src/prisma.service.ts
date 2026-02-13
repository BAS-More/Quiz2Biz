import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Database connection pool configuration
 * Optimized for production workloads with configurable limits
 */
const getConnectionPoolConfig = (): { connectionLimit: number; poolTimeout: number } => {
  return {
    // Connection pool size: min 10, max 50, default 20
    connectionLimit: Math.min(
      50,
      Math.max(10, parseInt(process.env.DATABASE_CONNECTION_LIMIT || '20', 10)),
    ),
    // Pool timeout in seconds: default 10s
    poolTimeout: parseInt(process.env.DATABASE_POOL_TIMEOUT || '10', 10),
  };
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly poolConfig = getConnectionPoolConfig();

  constructor() {
    const logLevels: Prisma.LogLevel[] =
      process.env.NODE_ENV === 'production'
        ? ['warn', 'error']
        : ['query', 'info', 'warn', 'error'];

    super({
      log: logLevels.map((level) => ({ emit: level === 'query' ? 'event' : 'stdout', level })),
      errorFormat: process.env.NODE_ENV === 'production' ? 'minimal' : 'colorless',
      datasources: {
        db: {
          // Append connection pool parameters to DATABASE_URL if not already present
          url: PrismaService.buildConnectionUrl(),
        },
      },
    });
  }

  /**
   * Build database URL with connection pooling parameters
   */
  private static buildConnectionUrl(): string {
    const baseUrl = process.env.DATABASE_URL || '';
    if (!baseUrl) {
      return baseUrl;
    }

    const poolConfig = getConnectionPoolConfig();
    const url = new URL(baseUrl);

    // Add connection pooling parameters if not present
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', poolConfig.connectionLimit.toString());
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', poolConfig.poolTimeout.toString());
    }

    return url.toString();
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(
      `Connecting to database (pool: ${this.poolConfig.connectionLimit} connections, timeout: ${this.poolConfig.poolTimeout}s)...`,
    );
    await this.$connect();
    this.logger.log('Database connection established');

    // Log slow queries (threshold: 100ms in dev, 500ms in prod)
    const slowQueryThreshold = process.env.NODE_ENV === 'production' ? 500 : 100;

    // @ts-expect-error - Prisma event typing
    this.$on('query', (e: { query: string; params: string; duration: number }) => {
      if (e.duration > slowQueryThreshold) {
        this.logger.warn(
          `Slow query (${e.duration}ms): ${e.query.substring(0, 200)}${e.query.length > 200 ? '...' : ''}`,
        );
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase can only be used in test environment');
    }

    const tablenames = await this.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter((name) => name !== '_prisma_migrations')
      .map((name) => `"public"."${name}"`)
      .join(', ');

    if (tables.length > 0) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    }
  }
}
