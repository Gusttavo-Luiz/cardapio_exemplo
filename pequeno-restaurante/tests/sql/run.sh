#!/usr/bin/env bash
# Aplica a migração num Postgres temporário e roda os testes de permissão.
# Requer os binários do PostgreSQL (initdb, pg_ctl, psql) no PATH ou em /usr/lib/postgresql/*/bin.
set -euo pipefail
cd "$(dirname "$0")"
PGBIN="$(dirname "$(command -v initdb 2>/dev/null || ls -d /usr/lib/postgresql/*/bin/initdb | tail -1)")"
DATA="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
# O Postgres não roda como root; nesse caso usa o usuário postgres do sistema.
AS=()
if [ "$(id -u)" = 0 ]; then AS=(runuser -u postgres --); chown postgres "$DATA"; fi
cleanup() { "${AS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT
"${AS[@]}" "$PGBIN/initdb" -D "$DATA" -U postgres -A trust >/dev/null
"${AS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k $DATA -c listen_addresses=''" -w start >/dev/null
PSQL=("$PGBIN/psql" -h "$DATA" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f supabase_stub.sql
"${PSQL[@]}" -f ../../supabase/migrations/*.sql
"${PSQL[@]}" -f rls_test.sql
