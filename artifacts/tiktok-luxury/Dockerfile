# Use Node.js as the build environment
FROM node:22-slim AS builder

WORKDIR /app

# Install pnpm 9 globally (matching root packageManager pnpm@9.15.9)
RUN npm install -g pnpm@9.15.9

# Copy root files and all workspace code needed for monorepo resolution
COPY . .

# Install dependencies for workspace without lockfile freezing
RUN pnpm install --no-frozen-lockfile

# Build the frontend static assets
RUN pnpm --filter @workspace/tiktok-luxury run build

# Use Nginx to serve the SPA static files in production
FROM nginx:alpine

# Copy built assets to Nginx html directory
COPY --from=builder /app/artifacts/tiktok-luxury/dist/public /usr/share/nginx/html

# Setup Nginx configuration to support client-side routing & API proxying
RUN echo 'server { \
    listen 80; \
    location /api/ { \
        proxy_pass http://127.0.0.1:8080/api/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_intercept_errors on; \
        error_page 404 405 502 503 = @api_json_error; \
    } \
    location @api_json_error { \
        default_type application/json; \
        return 502 "{\"error\": \"API gateway endpoint unavailable\"}"; \
    } \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
