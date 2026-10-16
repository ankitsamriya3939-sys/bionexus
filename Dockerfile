# Multi-stage production Dockerfile for BioNexus Studio Single Web Service
FROM node:22-alpine AS runner

# Set working directory
WORKDIR /app

# Ensure production environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5000

# Install dependencies (including devDependencies required for vite build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy project source code
COPY . .

# Build frontend production bundle into dist/
RUN npm run build

# Prune devDependencies to reduce final container footprint
RUN npm prune --production

# Prepare writable storage directory and assign ownership to non-root node user
RUN mkdir -p server/data storage/objects \
    && chown -R node:node /app

# Switch to non-root user
USER node

# Expose default application port
EXPOSE 5000

# Health check probe against the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-5000}/health || exit 1

# Start unified Node.js single-service backend
CMD ["node", "server/server.js"]
