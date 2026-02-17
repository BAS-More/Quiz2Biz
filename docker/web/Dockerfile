# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install security patches
RUN apk upgrade --no-cache

# Install dependencies
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY libs/shared/package*.json ./libs/shared/

COPY package-lock.json ./
RUN npm ci --ignore-scripts || npm install --ignore-scripts

# Copy source files
COPY . .

# Build the web application
RUN npx turbo run build --filter=web

# Production stage - serve with nginx
FROM nginx:1.27-alpine AS production

# Accept build argument for image version
ARG IMAGE_VERSION=unknown

# OCI labels for supply chain tracking
LABEL org.opencontainers.image.title="questionnaire-web" \
      org.opencontainers.image.description="Quiz2Biz Web — React SPA frontend" \
      org.opencontainers.image.vendor="Quiz2Biz" \
      org.opencontainers.image.source="https://github.com/Avi-Bendetsky/Quiz-to-build" \
      org.opencontainers.image.licenses="UNLICENSED" \
      org.opencontainers.image.base.name="docker.io/library/nginx:1.27-alpine" \
      org.opencontainers.image.version="${IMAGE_VERSION}"

# Install security patches
RUN apk upgrade --no-cache

# Create non-root user
RUN addgroup -g 1001 -S webapp && \
    adduser -S webapp -u 1001

# Copy built assets from builder
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy nginx configuration
COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
