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
COPY apps/api/package.json apps/api/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/db/package.json packages/db/package.json

RUN node scripts/validate-container-build-inputs.mjs
RUN corepack enable && corepack prepare pnpm@11.24.0 --activate
RUN pnpm install --frozen-lockfile

COPY apps/api apps/api
COPY packages/config packages/config
COPY packages/contracts packages/contracts
COPY packages/db packages/db

RUN pnpm --filter @local-missions/api... build
RUN pnpm --config.ignore-scripts=true --filter @local-missions/api deploy --legacy --prod --prefer-offline /output

FROM ${NODE_IMAGE} AS runtime
ARG BUILD_COMMIT
ARG BUILD_TIME
ARG BUILD_VERSION
ENV APP_ENV=development \
    BUILD_COMMIT=${BUILD_COMMIT} \
    BUILD_TIME=${BUILD_TIME} \
    BUILD_VERSION=${BUILD_VERSION} \
    NODE_ENV=production \
    PORT=4000
LABEL org.opencontainers.image.revision=${BUILD_COMMIT} \
      org.opencontainers.image.created=${BUILD_TIME} \
      org.opencontainers.image.version=${BUILD_VERSION} \
      org.opencontainers.image.title="Local Missions API"
WORKDIR /app
COPY --from=build --chown=10001:10001 /output ./
USER 10001:10001
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:4000/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "dist/main.js"]
