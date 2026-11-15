.DEFAULT_GOAL := help

PYTHON := .venv/bin/python
# Source comes from the active checkout even when .venv points to primary.
export PYTHONPATH := $(CURDIR)/src
export NAPMS_PYTHON := $(abspath $(PYTHON))
DB ?= var/napms.sqlite3
CREDENTIALS ?= var/dev-credentials.json
DB_ARGS = --db "$(DB)" --credentials "$(CREDENTIALS)"

.PHONY: help setup init-auth run reset-db test check check-full

help:
	@printf '%s\n' \
	  'make setup       — установить Python и Web зависимости в primary или изолированном checkout' \
	  'make init-auth   — явно создать учётные записи и полномочия' \
	  'make run         — запустить FastAPI + React без автозаполнения' \
	  'make reset-db    — удалить ВСЕ строки SQLite, оставить только структуру' \
	  'make test        — запустить backend pytest' \
	  'make check       — запустить существующий быстрый профиль проверок' \
	  'make check-full  — запустить полный профиль проверок'

setup:
	@if [ -L .venv ] || [ -L web/node_modules ]; then \
	  echo 'REFUSE: shared dependencies are linked; run make setup in primary, or remove links intentionally for isolated setup.'; \
	  exit 2; \
	fi
	python3 -m venv .venv
	$(PYTHON) -m pip install -e '.[test,quality,workflow]'
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
