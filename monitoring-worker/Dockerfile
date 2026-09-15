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
