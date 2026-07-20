# Use Node.js as the build environment
FROM node:22-slim AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy root monorepo files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy internal shared libraries
COPY lib/ ./lib/

# Copy the API server artifact
COPY artifacts/api-server/ ./artifacts/api-server/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Compile the project and build the API server
RUN pnpm run build

# Production stage
FROM node:22-slim

WORKDIR /app

# Copy built package and node_modules from the builder stage
COPY --from=builder /app/artifacts/api-server/package.json ./package.json
COPY --from=builder /app/artifacts/api-server/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Expose port 5000 (standard for the API server)
EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
