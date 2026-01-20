# Contributing Guide

Thanks for your interest in contributing! Please read this guide before submitting changes.

## Set up your local development environment

This repository is a monorepo using Bun workspaces. Use [Bun](https://bun.sh/) to install and link dependencies.

To get started, follow these steps:

1. Fork this repository to your GitHub account, then clone it locally.

2. Install dependencies from the repository root: `bun install`.

3. Start Redis server (required for queues): Connects to `redis://localhost:6379` by default. Override this by setting `REDIS_URL` in `apps/api/.env`.

## Development Workflow

If you are working on a feature or bug fix, follow these steps:

1. Create a branch for your work:

```shell
git checkout -b feature/xx # or bugfix/xx
```

2. Make your changes.

3. Commit and push your changes using [**conventional commits**](#commit-convention), then open a **`Pull Request`** to the **`main`** branch:

```shell
git add .
git commit -m "feat: my new feature"
git push origin feature/xx
```
> If you're new to pull requests, see the [**guide**](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request).

## Commit Convention

We use [**conventional commits**](https://www.conventionalcommits.org/) for commit messages so the changelog can be generated automatically. If you're unfamiliar with the format, please review the guide.

Only `feat:` and `fix:` commits will appear in the changelog. For documentation or maintenance changes, use `docs:` or `chore:` respectively.
