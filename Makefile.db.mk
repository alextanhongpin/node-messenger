migrator = ./node_modules/.bin/db-migrate --config config/database.json --env development --migrations-dir migrations

migrate:
	@$(migrator) up

rollback:
	@$(migrator) down --count 1

new_migration:
	@$(migrator) create $(name) --sql-file
