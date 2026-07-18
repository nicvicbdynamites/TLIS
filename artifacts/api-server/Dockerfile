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
RUN pnpm --filter @workspace/api-server --legacy deploy /app

FROM base AS runner
WORKDIR /app
COPY --from=build /app /app
# Port is provided by Cloud Run
EXPOSE 8080
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
