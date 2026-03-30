# SERVCTL - Docker convenience commands
# Usage: make <command>

.PHONY: help up down logs logs-backend logs-frontend build restart clean clean-all \
		up-cloud down-cloud build-cloud \
		db-migrate db-migrate-dev db-studio db-reset \
		generate-secrets setup

help:
	@echo "SERVCTL Docker Commands"
	@echo "------------------------------------"
	@echo "LOCAL MODE (default):"
	@echo "  make up           Start local stack"
	@echo "  make down         Stop local stack"
	@echo "  make logs         Tail all logs"
	@echo "  make build        Rebuild images"
	@echo ""
	@echo "CLOUD MODE:"
	@echo "  make up-cloud     Start cloud stack"
	@echo "  make down-cloud   Stop cloud stack"
	@echo ""
	@echo "DATABASE:"
	@echo "  make db-migrate   Run Prisma migrations"
	@echo "  make db-studio    Open Prisma Studio"
	@echo ""
	@echo "SETUP:"
	@echo "  make generate-secrets  Generate JWT + ENCRYPTION secrets"
	@echo "  make setup             First-time setup wizard"

# -- Local mode ------------------------------------------
up:
	docker compose up -d
	@echo "SERVCTL running at http://localhost"

down:
	docker compose down

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

build:
	docker compose build --no-cache

restart:
	docker compose restart

# -- Cloud mode ------------------------------------------
up-cloud:
	docker compose -f docker-compose.cloud.yml up -d
	@echo "SERVCTL cloud running at http://localhost"

down-cloud:
	docker compose -f docker-compose.cloud.yml down

build-cloud:
	docker compose -f docker-compose.cloud.yml build --no-cache

# -- Database --------------------------------------------
db-migrate:
	docker compose exec backend npx prisma migrate deploy

db-migrate-dev:
	docker compose exec backend npx prisma migrate dev

db-studio:
	docker compose exec backend npx prisma studio

db-reset:
	docker compose exec backend npx prisma migrate reset --force

# -- Cleanup ---------------------------------------------
clean:
	docker compose down -v --remove-orphans
	docker image rm servctl-frontend servctl-backend 2>/dev/null || true

clean-all: clean
	docker volume rm servctl-local-data 2>/dev/null || true
	docker network rm servctl-local-net 2>/dev/null || true

# -- Setup helpers ---------------------------------------
generate-secrets:
	@echo "Generated secrets - paste into your .env file:"
	@echo ""
	@printf "JWT_SECRET=%s\n" $$(openssl rand -hex 32)
	@printf "ENCRYPTION_SECRET=%s\n" $$(openssl rand -hex 32)
	@printf "ENCRYPTION_KEY=%s\n" $$(openssl rand -hex 32)

setup:
	@echo "SERVCTL First-time Setup"
	@echo "------------------------"
	@test -f .env || (cp .env.example .env && \
	echo "Created .env from .env.example")
	@echo ""
	@echo "Next steps:"
	@echo "  1. Edit .env and fill in JWT_SECRET and ENCRYPTION_KEY"
	@echo "     Run: make generate-secrets"
	@echo "  2. Start the stack:"
	@echo "     Run: make up"
	@echo "  3. Open http://localhost in your browser"
