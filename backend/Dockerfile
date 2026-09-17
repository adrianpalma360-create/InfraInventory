# ============================================================
# InfraInventory Backend - Multi-Stage Production Dockerfile
# ============================================================

# Stage 1: Build TypeScript & Generate Prisma Client
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY tsconfig.json ./
COPY src ./src/

RUN npx prisma generate
RUN npm run build

# Stage 2: Minimal Production Runtime
FROM node:20-alpine AS runner

ARG APP_VERSION=11.2.0

LABEL org.opencontainers.image.title="InfraInventory Backend" \
      org.opencontainers.image.description="Fastify & Prisma REST/WebSocket API for InfraInventory NOC Platform" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.vendor="Adrian Palma" \
      org.opencontainers.image.authors="Adrian Palma" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app

RUN apk add --no-cache openssl wget

RUN addgroup -S infrainventory && adduser -S infrainventory -G infrainventory

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh && chown -R infrainventory:infrainventory /app

USER infrainventory

EXPOSE 4000

ENV PORT=4000
ENV NODE_ENV=production

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:4000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
