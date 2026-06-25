#!/bin/sh
set -eu

if [ -z "${DB_PASSWORD:-}" ] && [ -n "${DB_CREDENTIALS:-}" ]; then
  DB_PASSWORD="$(node -e '
    const credentials = JSON.parse(process.env.DB_CREDENTIALS);
    if (!credentials.password) {
      process.exit(1);
    }
    process.stdout.write(credentials.password);
  ')"

  export DB_PASSWORD
fi

exec "$@"
