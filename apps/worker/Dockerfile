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
    PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json tsconfig.base.json ./
COPY scripts/validate-container-build-inputs.mjs scripts/validate-container-build-inputs.mjs
COPY apps/worker/package.json apps/worker/package.json

RUN node scripts/validate-container-build-inputs.mjs
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate
RUN pnpm install --frozen-lockfile

COPY apps/worker apps/worker

RUN pnpm --filter @local-missions/worker build
RUN pnpm --config.ignore-scripts=true --filter @local-missions/worker deploy --legacy --prod --prefer-offline /output

FROM ${NODE_IMAGE} AS runtime
ARG BUILD_COMMIT
ARG BUILD_TIME
ARG BUILD_VERSION
ENV APP_ENV=development \
    BUILD_COMMIT=${BUILD_COMMIT} \
    BUILD_TIME=${BUILD_TIME} \
    BUILD_VERSION=${BUILD_VERSION} \
    NODE_ENV=production
LABEL org.opencontainers.image.revision=${BUILD_COMMIT} \
      org.opencontainers.image.created=${BUILD_TIME} \
      org.opencontainers.image.version=${BUILD_VERSION} \
      org.opencontainers.image.title="Local Missions Worker"
WORKDIR /app
COPY --from=build --chown=10001:10001 /output ./
USER 10001:10001
STOPSIGNAL SIGTERM
CMD ["node", "dist/main.js"]
