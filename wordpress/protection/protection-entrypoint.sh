#!/bin/sh
set -eu
/usr/local/bin/sync-pecadosvip-protection.sh
exec docker-entrypoint.sh "$@"
