include .env
export

NAME := node-messenger
TAG := $(shell git rev-parse --short head)
IMG := ${NAME}:${TAG}


dev:
	npm run dev

up:
	@docker-compose up -d

down:
	@docker-compose down


build:
	@# --progress=plain shows the output of RUN ls -a
	@docker build --progress=plain -t ${NAME} -t ${IMG} .
	@make up

include Makefile.db.mk
