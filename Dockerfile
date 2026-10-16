# Production Dockerfile for BioNexus Studio Single Web Service
FROM node:22-alpine

WORKDIR /app

# Configure networking defaults (Render & cloud containers use port 10000)
ENV HOST=0.0.0.0
ENV PORT=10000

# Install dependencies (clean install)
COPY package.json package-lock.json ./
RUN npm ci

# Copy full application codebase
COPY . .

# Build frontend production bundle into dist/
RUN npm run build

# Set production environment flag after compilation
ENV NODE_ENV=production

# Prune devDependencies to reduce final container footprint
RUN npm prune --production

# Prepare writable storage directories
RUN mkdir -p server/data storage/objects \
    && chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose Render standard port
EXPOSE 10000

# Health check probe against the root /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-10000}/health || exit 1

# Start unified single-service backend
CMD ["node", "server/server.js"]
