# Use Node.js as the build environment
FROM node:22-slim AS builder

WORKDIR /app

# Accept Supabase environment variables as build arguments for Vite bundle
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Install pnpm globally
RUN npm install -g pnpm

# Copy root monorepo files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.json ./

# Copy internal shared libraries
COPY lib/ ./lib/

# Copy the frontend artifact
COPY artifacts/tiktok-luxury/ ./artifacts/tiktok-luxury/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

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
