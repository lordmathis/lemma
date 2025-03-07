#!/bin/bash

set -e

COMPOSE_FILE=docker-compose.test.yaml

if ! docker compose -f $COMPOSE_FILE ps postgres | grep -q "running"; then
  docker compose -f $COMPOSE_FILE up -d
    until docker compose -f $COMPOSE_FILE exec postgres pg_isready -U postgres; do
    sleep 1
  done
  echo "PostgreSQL is ready!"
fi

export LEMMA_TEST_POSTGRES_URL="postgres://postgres:postgres@localhost:5432/lemma_test?sslmode=disable"

echo "Running integration tests..."
go test -v -tags=test,integration ./...

docker compose -f $COMPOSE_FILE down
