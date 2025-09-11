# ---------- Build Stage ----------
FROM node:20-alpine AS builder

# Enable pnpm via corepack
RUN corepack enable

WORKDIR /app

# Copy lockfile and package.json first for better caching
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy rest of the source
COPY . .

# Build frontend (Vite → dist/)
RUN pnpm build

# ---------- Runtime Stage ----------
FROM node:20-alpine AS runner

RUN corepack enable
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Copy only what's needed for runtime
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile

# Healthcheck hits your proxy server
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

CMD ["node", "server.js"]
CMD ["node", "proxy/index.js"]