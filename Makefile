.DEFAULT_GOAL := help

PYTHON := .venv/bin/python
DB ?= var/napms.sqlite3
CREDENTIALS ?= var/dev-credentials.json
DB_ARGS = --db "$(DB)" --credentials "$(CREDENTIALS)"

.PHONY: help setup init-auth run reset-db test check check-full

help:
	@printf '%s\n' \
	  'make setup       — установить Python и Web зависимости' \
	  'make init-auth   — явно создать учётные записи и полномочия' \
	  'make run         — запустить FastAPI + React без автозаполнения' \
	  'make reset-db    — удалить ВСЕ строки SQLite, оставить только структуру' \
	  'make test        — запустить backend pytest' \
	  'make check       — запустить существующий быстрый профиль проверок' \
	  'make check-full  — запустить полный профиль проверок'

setup:
	python3 -m venv .venv
	$(PYTHON) -m pip install -e '.[test,quality]'
	npm --prefix web ci

init-auth:
	$(PYTHON) -m napms.dev init-auth $(DB_ARGS)

run:
	$(PYTHON) -m napms.dev run --profile local-demo $(DB_ARGS)

reset-db:
	@printf 'Удалить ВСЕ данные в $(DB), включая grants/actors? Введите RESET: '; \
	IFS= read -r answer && [ "$$answer" = RESET ] || { printf '\nСброс отменён.\n'; exit 1; }; \
	$(PYTHON) -m napms.dev reset-demo --yes $(DB_ARGS)

test:
	$(PYTHON) -m pytest -q

check:
	PATH="$(CURDIR)/.venv/bin:$$PATH" $(PYTHON) scripts/check-fast.py

check-full:
	PATH="$(CURDIR)/.venv/bin:$$PATH" $(PYTHON) scripts/check-fast.py --full
