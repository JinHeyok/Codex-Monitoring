# Repository Guidelines

## Project Structure & Module Organization

This repository is currently an empty scaffold. When adding code, keep the layout predictable:

- `src/` for application source code.
- `tests/` for automated tests that mirror `src/` structure.
- `docs/` for design notes, runbooks, and contributor documentation.
- `scripts/` for repeatable local or CI helper commands.
- `assets/` for static files such as images, sample payloads, or fixtures.

Prefer small, focused modules. Keep generated output, local caches, dependencies, and build artifacts out of source control.

## Build, Test, and Development Commands

No build system is configured yet. Add commands to the project manifest or `Makefile` as soon as the stack is chosen, and keep this section updated.

Recommended command names:

- `make dev` or `pnpm dev`: run the local development server or watcher.
- `make test` or `pnpm test`: run the full test suite.
- `make lint` or `pnpm lint`: run static checks and formatting validation.
- `make build` or `pnpm build`: produce a production-ready artifact.

Commands should be deterministic and safe to run repeatedly.

## Coding Style & Naming Conventions

Follow the formatter and linter configured for the chosen language. Until tooling exists, use 2-space indentation for JavaScript/TypeScript/JSON/YAML and 4-space indentation for Python. Use descriptive names: `camelCase` for variables/functions, `PascalCase` for classes/components, and `kebab-case` for file names unless the language ecosystem expects otherwise.

Keep public APIs explicit, avoid hidden global state, and prefer configuration through environment variables rather than hardcoded values.

## Testing Guidelines

Place tests under `tests/` or beside source files using a clear suffix such as `.test.ts`, `.spec.ts`, or `_test.py`. Cover core behavior, error paths, and boundary conditions before adding broad integration tests. Every bug fix should include a regression test when practical.

## Commit & Pull Request Guidelines

This directory has no Git history, so no existing commit convention is detectable. Use short, imperative commit messages such as `Add monitoring config parser` or `Fix dashboard refresh state`.

Pull requests should include a concise summary, test results, linked issue or task when available, and screenshots for UI changes.

## Security & Configuration Tips

Never commit secrets, credentials, private keys, customer data, internal host details, or raw authentication logs. Share configuration examples with placeholders such as `<HOST>`, `<PASSWORD>`, and `<TOKEN>`.

<!-- SPECKIT START -->
## Active Spec Kit Plan

- Current feature plan: `specs/001-token-usage-dashboard/plan.md`
- Follow the project constitution in `.specify/memory/constitution.md` before implementation.
<!-- SPECKIT END -->

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
