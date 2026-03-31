.PHONY: help deploy pull up down logs restart \
		login-ghcr secrets status

help:
	@echo "SERVCTL Production Commands"
	@echo "─────────────────────────────────────────"
	@echo "  make login-ghcr   Authenticate with ghcr.io"
	@echo "  make deploy       Pull latest + restart"
	@echo "  make pull         Pull latest images only"
	@echo "  make up           Start all services"
	@echo "  make down         Stop all services"
	@echo "  make restart      Restart all services"
	@echo "  make logs         Tail all logs"
	@echo "  make status       Show container status"
	@echo "  make secrets      Generate security keys"

CF=-f docker-compose.production.yml

# ── Authentication ──────────────────────────────────────
login-ghcr:
	@test -n "$$GHCR_TOKEN" || \
	  (echo "Error: GHCR_TOKEN not set in .env" && exit 1)
	@echo $$GHCR_TOKEN | \
	  docker login ghcr.io -u $$GHCR_USERNAME --password-stdin
	@echo "✓ Logged in to ghcr.io"

# ── Deployment ──────────────────────────────────────────
deploy: login-ghcr pull up
	@echo "✓ SERVCTL deployed successfully"

pull:
	docker compose $(CF) pull

up:
	docker compose $(CF) up -d
	@echo "✓ SERVCTL running at http://localhost"

down:
	docker compose $(CF) down

restart:
	docker compose $(CF) restart

# ── Monitoring ──────────────────────────────────────────
logs:
	docker compose $(CF) logs -f

logs-backend:
	docker compose $(CF) logs -f backend

logs-frontend:
	docker compose $(CF) logs -f frontend

status:
	docker compose $(CF) ps

# ── Setup ───────────────────────────────────────────────
setup:
	@test -f .env || (cp .env.production.example .env && \
	  echo "✓ Created .env from example")
	@echo ""
	@echo "Next steps:"
	@echo "  1. Fill in .env (JWT_SECRET, ENCRYPTION_SECRET, GHCR_TOKEN)"
	@echo "  2. Run: make secrets (generates the security keys)"
	@echo "  3. Run: make deploy"

secrets:
	@echo "Paste these into your .env:"
	@echo ""
	@printf "JWT_SECRET=%s\n" $$(openssl rand -hex 32)
	@printf "ENCRYPTION_SECRET=%s\n" $$(openssl rand -hex 32)

clean:
	docker compose $(CF) down -v --remove-orphans
