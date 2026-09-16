#!/usr/bin/env bash
# Runs the migrations and the security test suite against a throwaway local
# PostgreSQL, so changes to supabase/*.sql can be checked without touching the
# live project. Needs postgresql-16 installed.
#
#   ./scripts/verify-local.sh
set -euo pipefail

PORT=${PGPORT:-5433}
PGDATA=${PGDATA:-/var/lib/postgresql/myrps}
export PATH=/usr/lib/postgresql/16/bin:$PATH
cd "$(dirname "$0")/.."

# pg_ctl and initdb must run as the postgres user, which does not inherit our
# PATH, so spell out the binary directory in each su.
PGBIN=/usr/lib/postgresql/16/bin
AS_PG="su postgres -c"

if ! $AS_PG "$PGBIN/pg_ctl -D $PGDATA status" >/dev/null 2>&1; then
  echo "Starting a local PostgreSQL on port $PORT…"
  if [ ! -d "$PGDATA/base" ]; then
    mkdir -p "$PGDATA"
    chown postgres:postgres "$PGDATA"
    $AS_PG "$PGBIN/initdb -D $PGDATA -A trust -U postgres" >/dev/null
  fi
  $AS_PG "$PGBIN/pg_ctl -D $PGDATA -l $PGDATA/log -o '-p $PORT -k /tmp' -w start" >/dev/null
fi

PSQL="psql -h /tmp -p $PORT -U postgres -q -v ON_ERROR_STOP=1"

echo "Recreating the test database…"
$PSQL -d postgres -c "drop database if exists myrps_verify" -c "create database myrps_verify" >/dev/null

echo "Installing Supabase stand-ins…"
$PSQL -d myrps_verify -f scripts/local-stub.sql >/dev/null

echo "Applying migrations…"
for f in supabase/[0-9][0-9]_*.sql; do
  printf '  %-34s' "$f"
  $PSQL -d myrps_verify -f "$f" >/dev/null && echo ok
done
# 08_psychometric_items.sql is part of the numbered set above

echo
echo "Running the security suite…"
psql -h /tmp -p "$PORT" -U postgres -d myrps_verify -v ON_ERROR_STOP=1 \
     -f scripts/local-test.sql 2>&1 \
  | grep -E 'PASS:|ERROR:' | sed 's/^psql[^ ]* //'

echo
echo "Done. $(psql -h /tmp -p "$PORT" -U postgres -d myrps_verify -tAc \
  "select 'schema has ' || count(*) || ' tables'
     from pg_tables where schemaname = 'public'")"
