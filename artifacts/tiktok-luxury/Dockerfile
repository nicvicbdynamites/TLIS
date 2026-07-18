# syntax=docker/dockerfile:1
FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build
RUN pnpm --filter @workspace/tiktok-luxury --legacy deploy /app

FROM base AS runner
WORKDIR /app
COPY --from=build /app /app
# We use a simple server to serve the static files, or use pnpm preview if configured
# For Vite apps, pnpm deploy will copy the dist/public folder.
# We'll use a simple node script to serve the static files if needed, 
# but pnpm preview is often enough for a quick deployment.
RUN pnpm add -g serve
EXPOSE 8080
CMD ["serve", "-s", "dist/public", "-l", "8080"]
