# --------------------
# Base Stage (shared)
# --------------------
FROM debian:trixie-slim AS base
ARG BUN_VERSION="1.3.6" \
    TARGETARCH

ENV DEBIAN_FRONTEND="noninteractive" \
    SHELL="/bin/bash" \
    NODE_ENV="production" \
    BUN_INSTALL="/root/.bun" \
    PATH="/root/.bun/bin:$PATH"

# common deps
RUN set -eux; \
    packages="ca-certificates curl unzip"; \
    apt-get -qq update; \
    apt-get -qq install -y --no-install-recommends $packages; \
    rm -rf /var/lib/apt/lists/*

# install Bun
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}"


# --------------------
# Builder Stage
# --------------------
FROM base AS builder
ARG TARGETARCH

ENV VITE_API_URL="/api"

# build workspace
WORKDIR /build

# build-only deps
RUN set -eux; \
    if [ "$TARGETARCH" = "arm64" ]; then \
      packages="python3 build-essential"; \
      apt-get -qq update; \
      apt-get -qq install -y --no-install-recommends $packages; \
      rm -rf /var/lib/apt/lists/*; \
    fi

# install full dependencies for build (cache-friendly)
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/dashboard/package.json ./apps/dashboard/
RUN bun install --frozen-lockfile

# build application artifacts
COPY . .
RUN bun run build

# prepare artifacts
RUN set -eux; \
    # srv (application code)
    mkdir -p /artifact/srv/apps/api /artifact/srv/apps/dashboard; \
    cp -a package.json tsconfig.json bun.lock /artifact/srv/; \
    cp -a apps/api/package.json apps/api/tsconfig.json apps/api/src apps/api/drizzle /artifact/srv/apps/api/; \
    cp -a apps/dashboard/package.json apps/dashboard/dist /artifact/srv/apps/dashboard/; \
    \
    # etc (runtime configuration)
    mkdir -p /artifact/etc; \
    cp -a docker/etc/* /artifact/etc/; \
    chmod +x /artifact/etc/s6-overlay/s6-rc.d/*/run

# install production-only dependencies
WORKDIR /artifact/srv
RUN bun install --production --frozen-lockfile --filter '!./apps/dashboard'


# --------------------
# Runtime Stage
# --------------------
FROM base AS runtime
ARG S6_OVERLAY_VERSION="3.2.1.0" \
    TARGETARCH

ENV S6_VERBOSITY="1"

# runtime-only deps
RUN set -eux; \
    # install runtime packages
    packages="nginx redis-server xz-utils"; \
    apt-get -qq update; \
    apt-get -qq install -y --no-install-recommends $packages; \
    # install s6-overlay
    case "${TARGETARCH}" in \
        amd64) s6_arch="x86_64" ;; \
        arm64) s6_arch="aarch64" ;; \
        *) echo "Unsupported architecture: ${TARGETARCH}"; exit 1 ;; \
    esac; \
    for part in "noarch" "${s6_arch}"; do \
      curl -fsSL "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-${part}.tar.xz" \
        | tar -C / -Jxpf -; \
    done; \
    \
    # cleanup
    apt-get -qq purge -y --auto-remove xz-utils; \
    rm -rf /var/lib/apt/lists/*; \
    \
    # create redis data dir
    mkdir -p /data/redis

# copy build artifacts
COPY --from=builder /artifact/srv/ /srv/
COPY --from=builder /artifact/etc/ /etc/

EXPOSE 3000
VOLUME ["/data"]
ENTRYPOINT ["/init"]
