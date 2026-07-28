# Use Node.js as the build environment
FROM node:22-slim AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy root monorepo files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.json ./

# Copy internal shared libraries
COPY lib/ ./lib/

# Copy the API server artifact
COPY artifacts/api-server/ ./artifacts/api-server/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Compile the project and build the API server
RUN pnpm run build

# Production stage
FROM node:22-slim

WORKDIR /app

# Copy entire built workspace from builder stage to preserve pnpm node_modules symlinks
COPY --from=builder /app /app

WORKDIR /app/artifacts/api-server

# Expose port 8080 (standard for Cloud Run)
EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "--enable-source-maps", "dist/index.js"]
