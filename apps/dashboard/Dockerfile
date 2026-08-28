ARG NODE_IMAGE

FROM ${NODE_IMAGE} AS build
ARG NODE_IMAGE
ARG BUILD_COMMIT
ARG BUILD_TIME
ARG BUILD_VERSION
ENV CONTAINER_BASE_IMAGE=${NODE_IMAGE} \
    BUILD_COMMIT=${BUILD_COMMIT} \
    BUILD_TIME=${BUILD_TIME} \
    BUILD_VERSION=${BUILD_VERSION} \
    CI=true \
    NEXT_TELEMETRY_DISABLED=1 \
    PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json tsconfig.base.json ./
COPY scripts/validate-container-build-inputs.mjs scripts/validate-container-build-inputs.mjs
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY packages/api-client/package.json packages/api-client/package.json

RUN node scripts/validate-container-build-inputs.mjs
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate
RUN pnpm install --frozen-lockfile

COPY apps/dashboard apps/dashboard
COPY packages/api-client packages/api-client

RUN pnpm --filter @local-missions/dashboard... build

FROM ${NODE_IMAGE} AS runtime
ARG BUILD_COMMIT
ARG BUILD_TIME
ARG BUILD_VERSION
ENV APP_ENV=development \
    BUILD_COMMIT=${BUILD_COMMIT} \
    BUILD_TIME=${BUILD_TIME} \
    BUILD_VERSION=${BUILD_VERSION} \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    PORT=3000
LABEL org.opencontainers.image.revision=${BUILD_COMMIT} \
      org.opencontainers.image.created=${BUILD_TIME} \
      org.opencontainers.image.version=${BUILD_VERSION} \
      org.opencontainers.image.title="Local Missions Dashboard"
WORKDIR /app/apps/dashboard
COPY --from=build --chown=10001:10001 /workspace/apps/dashboard/.next/standalone /app
COPY --from=build --chown=10001:10001 /workspace/apps/dashboard/.next/static ./.next/static
USER 10001:10001
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]
