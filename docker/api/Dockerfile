# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install security patches and OpenSSL for Prisma
RUN apk upgrade --no-cache && \
    apk add --no-cache openssl

# Install dependencies
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY libs/database/package*.json ./libs/database/
COPY libs/redis/package*.json ./libs/redis/
COPY libs/shared/package*.json ./libs/shared/

RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy source files
COPY . .

# Generate Prisma client (use local binary to ensure version consistency)
RUN ./node_modules/.bin/prisma generate

# Build the application (API and dependencies only, exclude CLI and web)
RUN npx turbo run build --filter=api --filter=database --filter=redis --filter=shared

# Prune dev dependencies for production
# NOTE: npm prune runs AFTER build to remove dev dependencies.
# This is intentional: dev dependencies are needed during build but not in production.
# The pruned node_modules are then copied to the production stage.
# OPTIMIZATION CONSIDERATION: For smaller images, consider:
# - Using npm ci --production in a separate stage to avoid copying dev deps
# - Multi-stage builds with only production dependencies in final stage
# - Using .dockerignore to exclude unnecessary files from context
RUN npm prune --omit=dev --legacy-peer-deps || true

# Development stage
FROM node:22-alpine AS development

WORKDIR /app

# Install security patches and OpenSSL for Prisma
RUN apk upgrade --no-cache && \
    apk add --no-cache openssl

# Install dependencies
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY libs/database/package*.json ./libs/database/
COPY libs/redis/package*.json ./libs/redis/
COPY libs/shared/package*.json ./libs/shared/

RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy source files
COPY . .

# Generate Prisma client (use local binary to ensure version consistency)
RUN ./node_modules/.bin/prisma generate

# Expose port
EXPOSE 3000

# Start in development mode
CMD ["npm", "run", "start:dev"]

# Production stage (must be last for default ACR build)
FROM node:22-alpine AS production

# Accept build argument for image version
ARG IMAGE_VERSION=unknown

# OCI labels for supply chain tracking
LABEL org.opencontainers.image.title="questionnaire-api" \
    org.opencontainers.image.description="Quiz2Biz API — NestJS backend" \
    org.opencontainers.image.vendor="Quiz2Biz" \
    org.opencontainers.image.source="https://github.com/Avi-Bendetsky/Quiz-to-build" \
    org.opencontainers.image.licenses="UNLICENSED" \
    org.opencontainers.image.base.name="docker.io/library/node:22-alpine" \
    org.opencontainers.image.version=$IMAGE_VERSION

WORKDIR /app

# Install security patches and OpenSSL for Prisma
RUN apk upgrade --no-cache && \
    apk add --no-cache openssl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy built application with pruned production dependencies
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/tsconfig.json ./tsconfig.json

# Copy libs with both src and dist directories for path resolution
# tsconfig-paths needs the source structure
COPY --from=builder --chown=nestjs:nodejs /app/libs ./libs

# Copy entrypoint script
COPY --chown=nestjs:nodejs docker/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Start the application
CMD ["./entrypoint.sh"]
