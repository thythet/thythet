#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
trunk build --release
printf '\nDeckCraft Web built at ../../dist/web\n'
