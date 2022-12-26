include .env
export

dev:
	npm run dev

up:
	@docker-compose up -d

down:
	@docker-compose down

include Makefile.db.mk
