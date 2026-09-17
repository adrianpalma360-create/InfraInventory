# Stage 1: Build TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src/

RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner

ARG APP_VERSION=11.2.0

LABEL org.opencontainers.image.title="InfraInventory Monitoring Worker" \
      org.opencontainers.image.description="Real-time telemetry and monitoring daemon for InfraInventory" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.vendor="Adrian Palma" \
      org.opencontainers.image.authors="Adrian Palma" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app

RUN apk add --no-cache iputils

RUN addgroup -S palmainventory && adduser -S palmainventory -G palmainventory

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

RUN chown -R palmainventory:palmainventory /app

USER palmainventory

EXPOSE 5050

ENV PORT=5050
ENV NODE_ENV=production
ENV BACKEND_URL=http://backend:4000

CMD ["node", "dist/server.js"]
