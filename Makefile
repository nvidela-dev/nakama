# npm scripts own command implementations; this file only orders workflows.
.DEFAULT_GOAL := help
.NOTPARALLEL:
.PHONY: help doctor check verify frontend dev storybook e2e

help:
	@printf '%s\n' 'make doctor    Read-only prerequisite check' 'make check     Types/schema and tests' 'make verify    Check + production build, log exclusion (CI)' 'make frontend  Refactor checks + Storybook; requires frontend integration' 'make dev       Start development server' 'make storybook Start component explorer' 'make e2e       Browser tests against configured isolated services; see docs/agent-harness.md'

doctor:
	node scripts/harness-doctor.mjs

check: doctor
	npm run typecheck
	npm test

verify: check
	npm run logs:check-bundle -- --seed
	npm run build
	npm run logs:check-bundle

frontend: doctor
	node scripts/harness-doctor.mjs --frontend
	npm run lint
	npm run format:check
	npm run architecture:check
	npm run flows:check
	npm run storybook:build

dev:
	npm run dev

storybook:
	npm run storybook

e2e:
	npm run test:e2e
