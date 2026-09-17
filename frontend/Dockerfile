# ============================================================
# InfraInventory Frontend - Multi-Stage Production Dockerfile
# ============================================================

# Stage 1: Build static React SPA
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY public ./public/
COPY index.html ./
COPY src ./src/

ENV VITE_API_BASE_URL=/api

RUN npm run build

# Stage 2: Minimal Production Nginx Runner
FROM nginx:1.25-alpine AS runner

ARG APP_VERSION=11.2.1

LABEL org.opencontainers.image.title="InfraInventory Frontend" \
      org.opencontainers.image.description="Modern React SPA Frontend for InfraInventory NOC Platform" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.vendor="Adrian Palma" \
      org.opencontainers.image.authors="Adrian Palma" \
      org.opencontainers.image.licenses="MIT"

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
