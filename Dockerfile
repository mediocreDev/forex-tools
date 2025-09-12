FROM node:20-alpine

# Enable pnpm
RUN corepack enable && apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install only production dependencies
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile

# Copy proxy source only
COPY proxy ./proxy

# Drop privileges (optional, safer)
RUN adduser -D appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 5000

# Healthcheck just for API
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://localhost:${PORT}/health || exit 1

CMD ["node", "proxy/index.js"]
