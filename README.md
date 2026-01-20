## Cron Pilot

A self-hosted cron task manager that provides an API and a web dashboard. It allows you to schedule shell commands using cron expressions, manage task states centrally, and review execution history, runtime metrics, and performance statistics.

## Features

- Task lifecycle management: create, update, enable/disable, and delete tasks
- Cron scheduling: powered by BullMQ workers
- Execution history: status, duration, exit code, and stdout/stderr logs
- Task metrics: total runs, failure count, and last/next run timestamps
- Auto-install: automatic package installation for executing standalone scripts via [Bun](https://bun.com/docs/runtime/auto-install)

## Deployment

This service can be deployed using Docker, either via the Docker CLI or Docker
Compose.

### Environment Variables

These environment variables configure dashboard authentication and security. Change defaults before production use.

| Name            | Description                                | Required | Default     |
|-----------------|--------------------------------------------|----------|-------------|
| `AUTH_SECRET`   | JWT signing secret                         | Yes      | —           |
| `AUTH_USERNAME` | Dashboard login username                   | No       | `root`      |
| `AUTH_PASSWORD` | Dashboard login password                   | No       | `password`  |

> ⚠️ **Security note**: It is strongly recommended to set a strong `AUTH_SECRET` and change the default username and password before exposing the service.

### Run with Docker CLI

```bash
docker run -d \
  --name cronpilot \
  -p 3000:3000 \
  -e AUTH_SECRET="change-me" \
  -e AUTH_USERNAME="root" \
  -e AUTH_PASSWORD="password" \
  -v cronpilot-data:/data \
  ghcr.io/usings/cron-pilot:latest
```

### Run with Docker Compose

```yaml
services:
  cronpilot:
    image: ghcr.io/usings/cron-pilot:latest
    container_name: cronpilot
    ports:
      - "3000:3000"
    environment:
      AUTH_SECRET: change-me
      AUTH_USERNAME: root
      AUTH_PASSWORD: password
    volumes:
      - cronpilot-data:/data
    restart: unless-stopped

volumes:
  cronpilot-data:
```

Next, execute the following command to start the services:

```bash
docker compose up -d
```
