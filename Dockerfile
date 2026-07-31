# syntax=docker/dockerfile:1.7

FROM golang:1.24.5-bookworm AS age-builder
RUN CGO_ENABLED=0 go install filippo.io/age/cmd/age@v1.3.0 \
  && CGO_ENABLED=0 go install filippo.io/age/cmd/age-keygen@v1.3.0

FROM node:22.23.1-bookworm-slim AS build
ARG PNPM_VERSION=10.33.2
RUN npm install --global "pnpm@${PNPM_VERSION}"
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/geo/package.json packages/geo/package.json
COPY packages/schemas/package.json packages/schemas/package.json
RUN pnpm install --filter=@chinasupply/api... --frozen-lockfile
COPY . .
RUN pnpm exec turbo run build --filter=@chinasupply/api...
RUN pnpm --filter @chinasupply/api deploy --prod --legacy /deploy

FROM postgres:17.5-bookworm AS runtime
ENV NODE_ENV=production
RUN groupadd --gid 10001 chinasupply \
  && useradd --uid 10001 --gid chinasupply --create-home chinasupply
COPY --from=build /usr/local/bin/node /usr/local/bin/node
COPY --from=build /usr/local/lib/node_modules/pnpm /usr/local/lib/node_modules/pnpm
COPY --from=age-builder /go/bin/age /usr/local/bin/age
COPY --from=age-builder /go/bin/age-keygen /usr/local/bin/age-keygen
RUN ln -s ../lib/node_modules/pnpm/bin/pnpm.cjs /usr/local/bin/pnpm
WORKDIR /app
COPY --from=build --chown=chinasupply:chinasupply /deploy/ ./
USER chinasupply
ENTRYPOINT ["node", "--enable-source-maps", "dist/start-service.js"]
