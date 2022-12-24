migrator = ./node_modules/.bin/db-migrate --config config/database.json --env development --migrations-dir migrations

migrate:
	@$(migrator) up

rollback:
	@$(migrator) down

new_migration:
	@$(migrator) create $(name) --sql-file
