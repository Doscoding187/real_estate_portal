# ============================================================================
# PROPERTY LISTIFY SA - Makefile
# ============================================================================
# One-command workflow for local development
# ============================================================================

APP_NAME=propertylistify
.PHONY: env docker-up docker-down db-migrate db-seed dev dev-full build preview clean help

## ---------- HELP ----------
help:
	@echo ""
	@echo "Property Listify SA - Development Commands"
	@echo "==========================================="
	@echo ""
	@echo "Setup:"
	@echo "  make env          - Create .env.local from example"
	@echo "  make docker-up    - Start the Database Authority MySQL service"
	@echo "  make docker-down  - Stop the bounded Database Authority service"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate   - Run canonical local SQL migrations"
	@echo "  make db-seed      - Seed the canonical guarded local database"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start dev server"
	@echo "  make dev-full     - Full setup + dev server"
	@echo ""
	@echo "Build:"
	@echo "  make build        - Production build"
	@echo "  make preview      - Preview production build"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean        - Clean node_modules + reinstall"
	@echo ""

## ---------- ENV ----------
env:
	@test -f .env.local || cp .env.example .env.local
	@echo "✅ .env.local ready"

## ---------- DOCKER ----------
docker-up:
	@pnpm db:local:start
	@echo "Database Authority MySQL service started"

docker-down:
	@pnpm db:local:stop
	@echo "Database Authority MySQL service stopped"

## ---------- DATABASE ----------
db-migrate:
	@pnpm db:migrate:local
	@echo "📦 Database migrated"

db-seed:
	@pnpm db:seed:local
	@echo "🌱 Database seeded"

## ---------- DEV ----------
dev:
	@pnpm run dev

dev-full: env
	@pnpm db:prepare:local
	@pnpm run dev

## ---------- BUILD ----------
build:
	@pnpm run build

preview:
	@pnpm run preview

## ---------- CLEAN ----------
clean:
	@if exist node_modules rmdir /s /q node_modules
	@pnpm install
	@echo "✅ Clean install complete"
