# Build stage
FROM node:25-alpine AS builder

WORKDIR /app

# GitHub Packages auth for @bas-more scope
ARG GH_PACKAGES_TOKEN
ENV GH_PACKAGES_TOKEN=${GH_PACKAGES_TOKEN}

# Install security patches
RUN apk upgrade --no-cache

# Install dependencies
COPY .npmrc ./
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY libs/shared/package*.json ./libs/shared/

RUN npm ci --ignore-scripts --legacy-peer-deps || npm install --ignore-scripts --legacy-peer-deps

# Remove .npmrc after install
RUN rm -f .npmrc

# Copy source files
COPY . .

# Build-time environment variables for OAuth and API
ARG VITE_API_URL=""
ARG VITE_MICROSOFT_CLIENT_ID=""
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_MICROSOFT_CLIENT_ID=$VITE_MICROSOFT_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Write env file for Vite build (Vite reads from .env files, not shell ENV)
RUN echo "VITE_API_URL=${VITE_API_URL}" > apps/web/.env.production.local && \
    echo "VITE_MICROSOFT_CLIENT_ID=${VITE_MICROSOFT_CLIENT_ID}" >> apps/web/.env.production.local && \
    echo "VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}" >> apps/web/.env.production.local && \
    echo "=== Environment file contents ===" && \
    cat apps/web/.env.production.local && \
    echo "================================="

# Build the web application
RUN npx turbo run build --filter=web && \
    echo "=== Checking built JS for client_id ===" && \
    grep -r "a9552f92" apps/web/dist/assets/*.js || echo "Client ID NOT found in build"

# Production stage - serve with nginx
FROM nginx:1.27-alpine AS production

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

# Copy nginx configuration template (envsubst replaces ${API_UPSTREAM} at runtime)
COPY docker/web/nginx.conf /etc/nginx/templates/default.conf.template

# Default API upstream — override via docker-compose or -e at runtime
ENV API_UPSTREAM=http://api:3000

# Fix permissions for non-root nginx
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run && \
    chown -R webapp:webapp /var/cache/nginx /var/log/nginx /var/run /etc/nginx/conf.d && \
    chmod -R 755 /var/cache/nginx /var/log/nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Run as non-root user (nginx master stays root for port 80, workers run as webapp)
# Note: nginx:1.27-alpine supports NGINX_ENVSUBST_TEMPLATE_DIR natively
CMD ["nginx", "-g", "daemon off;"]
