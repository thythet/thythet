#!/bin/bash

clear

echo "Drag any HTML file into this window, then press Enter:"
echo ""

read filepath

# Remove surrounding quotes
filepath="${filepath%\"}"
filepath="${filepath#\"}"

# Handle escaped spaces from drag & drop
filepath="${filepath//\\ / }"

folder="$(dirname "$filepath")"
file="$(basename "$filepath")"

cd "$folder" || {
    echo "Cannot open folder."
    exit 1
}

echo ""
echo "Starting localhost..."
echo "http://localhost:8000/$file"
echo ""

python3 -m http.server 8000 &

SERVER_PID=$!

sleep 2

open -a "Google Chrome" "http://localhost:8000/$file"

echo ""
echo "Server is running."
echo "Press Control + C to stop."
echo ""

wait $SERVER_PID