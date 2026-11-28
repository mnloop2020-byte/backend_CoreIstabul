#!/usr/bin/env bash
# Runs every SQL file in sql/ in order and saves each output to results/.
# Usage (from this folder, in Git Bash):  bash run-all.sh
set -euo pipefail
cd "$(dirname "$0")"

# Connection settings come from .env (not committed). See .env.example.
if [[ ! -f .env ]]; then
  echo "Missing .env - copy .env.example to .env and set PGPASSWORD." >&2
  exit 1
fi
set -a; source .env; set +a

export PGHOST="${PGHOST:-localhost}"
export PGPORT="${PGPORT:-5432}"
export PGUSER="${PGUSER:-postgres}"
export PGDATABASE="${PGDATABASE:-library_db}"
export PGCLIENTENCODING=UTF8

# Use psql from PATH, or the default Windows install of PostgreSQL 18.
PSQL="$(command -v psql || echo "/c/Program Files/PostgreSQL/18/bin/psql.exe")"

# Create the database the first time.
exists="$("$PSQL" -X -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$PGDATABASE'")"
if [[ "$exists" != "1" ]]; then
  echo "Creating database $PGDATABASE"
  "$PSQL" -X -d postgres -qc "CREATE DATABASE $PGDATABASE"
fi

mkdir -p results
for file in sql/*.sql; do
  name="$(basename "$file" .sql)"
  # 06_transaction.sql contains an error on purpose (to show ROLLBACK), so it must not stop.
  stop=1
  [[ "$name" == "06_transaction" ]] && stop=0
  echo "Running $file"
  "$PSQL" -X --echo-queries -v ON_ERROR_STOP=$stop -f "$file" > "results/$name.txt" 2>&1 || {
    echo "Failed: $file (see results/$name.txt)" >&2
    exit 1
  }
done
echo "Done. Outputs are in results/"
