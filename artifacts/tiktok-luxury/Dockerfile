# Use Node.js as the build environment
FROM node:22-slim AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy root monorepo files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy internal shared libraries
COPY lib/ ./lib/

# Copy the frontend artifact
COPY artifacts/tiktok-luxury/ ./artifacts/tiktok-luxury/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the frontend static assets
RUN pnpm --filter @workspace/tiktok-luxury run build

# Use Nginx to serve the SPA static files in production
FROM nginx:alpine

# Copy built assets to Nginx html directory
COPY --from=builder /app/artifacts/tiktok-luxury/dist/public /usr/share/nginx/html

# Setup Nginx configuration to support client-side routing (fallback to index.html)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
