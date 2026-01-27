# ============================================================================
# PROPERTY LISTIFY SA - Makefile
# ============================================================================
# One-command workflow for local development
# ============================================================================

APP_NAME=propertylistify
DOCKER_COMPOSE=docker compose

.PHONY: env docker-up docker-down docker-reset docker-logs db-shell db-migrate db-seed dev dev-full build preview clean help

## ---------- HELP ----------
help:
	@echo ""
	@echo "Property Listify SA - Development Commands"
	@echo "==========================================="
	@echo ""
	@echo "Setup:"
	@echo "  make env          - Create .env.local from example"
	@echo "  make docker-up    - Start Docker services (MySQL)"
	@echo "  make docker-down  - Stop Docker services"
	@echo "  make docker-reset - Reset Docker (wipe DB)"
	@echo ""
	@echo "Database:"
	@echo "  make db-shell     - Open MySQL CLI"
	@echo "  make db-migrate   - Run Drizzle migrations"
	@echo "  make db-seed      - Seed database"
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
	@if not exist .env.local copy .env.example .env.local
	@echo "✅ .env.local ready"

## ---------- DOCKER ----------
docker-up:
	@$(DOCKER_COMPOSE) up -d
	@echo "🐳 Docker services started"

docker-down:
	@$(DOCKER_COMPOSE) down
	@echo "🛑 Docker services stopped"

docker-reset:
	@$(DOCKER_COMPOSE) down -v
	@$(DOCKER_COMPOSE) up -d
	@echo "♻️ Docker reset complete"

docker-logs:
	@$(DOCKER_COMPOSE) logs -f

## ---------- DATABASE ----------
db-shell:
	@docker exec -it propertylistify-mysql mysql -upropertylistify -ppropertylistify propertylistify_dev

db-migrate:
	@pnpm drizzle-kit push
	@echo "📦 Database migrated"

db-seed:
	@pnpm tsx scripts/seed.ts
	@echo "🌱 Database seeded"

## ---------- DEV ----------
dev:
	@pnpm run dev

dev-full: env docker-up dev

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
