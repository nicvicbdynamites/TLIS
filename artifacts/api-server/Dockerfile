# Use Node.js as the build environment
FROM node:22-slim AS builder

WORKDIR /app

# Install pnpm 9 globally (matching root packageManager pnpm@9.15.9)
RUN npm install -g pnpm@9.15.9

# Copy root files and all workspace code needed for monorepo resolution
COPY . .

# Install dependencies for workspace without lockfile freezing
RUN pnpm install --no-frozen-lockfile

# Build the API server target
RUN pnpm --filter @workspace/api-server run build

# Production stage
FROM node:22-slim

WORKDIR /app

# Copy built workspace and node_modules from builder stage
COPY --from=builder /app /app

WORKDIR /app/artifacts/api-server

# Expose port 8080 (standard for Cloud Run / Cloud Build deployments)
EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "--enable-source-maps", "dist/index.js"]
