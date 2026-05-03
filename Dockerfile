# ── Stage 1: Build Vue SPA ───────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG BUILD_VERSION=dev
ENV VITE_APP_VERSION=$BUILD_VERSION

RUN pnpm run build

# ── Stage 2: Production ─────────────────────────────────────
FROM node:20-alpine
RUN corepack enable && apk add --no-cache curl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile

COPY proxy ./proxy
COPY --from=builder /app/dist ./dist

RUN adduser -D appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://localhost:${PORT}/health || exit 1

CMD ["node", "proxy/index.js"]
