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

LABEL org.opencontainers.image.title="InfraInventory Discovery" \
      org.opencontainers.image.description="Advanced Network discovery, SNMP & port scanner microservice for InfraInventory" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.vendor="Adrian Palma" \
      org.opencontainers.image.authors="Adrian Palma" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Install lightweight networking tools for non-privileged container ICMP ping and ARP
RUN apk add --no-cache iputils iproute2 libcap && \
    addgroup -S palmainventory && \
    adduser -S palmainventory -G palmainventory && \
    setcap cap_net_raw+ep /bin/ping || true

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

RUN chown -R palmainventory:palmainventory /app

USER palmainventory

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
