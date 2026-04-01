# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

# Stage 2: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

# Install OpenSSL for Prisma compatibility
RUN apk add --no-cache openssl openssl-dev

# Install production dependencies only.
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev
RUN npx prisma generate

# Copy compiled output from builder.
COPY --from=builder /app/dist ./dist

# Volume mount point for data and auto-generated secrets.
RUN mkdir -p /app/data

# Copy entrypoint script for auto-secret generation.
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Run as a non-root user.
RUN addgroup -g 1001 -S servctl && \
    adduser -S servctl -u 1001 -G servctl
RUN chown -R servctl:servctl /app
USER servctl

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Auto-generate secrets, run migrations, then start server.
CMD ["/app/docker-entrypoint.sh"]
