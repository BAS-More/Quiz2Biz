# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY libs/shared/package*.json ./libs/shared/

COPY package-lock.json ./
RUN npm ci --ignore-scripts --legacy-peer-deps || npm install --ignore-scripts --legacy-peer-deps

# Copy source files
COPY . .

# Build-time environment variables for OAuth and API
ARG VITE_API_URL=""
ARG VITE_MICROSOFT_CLIENT_ID=""
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_MICROSOFT_CLIENT_ID=$VITE_MICROSOFT_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Build the web application
RUN npx turbo run build --filter=web

# Production stage - serve with nginx
FROM nginx:1.27-alpine AS production

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
