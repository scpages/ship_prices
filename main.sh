#!/bin/bash
set -e

echo "Generating HTML from data..."
node transform.js
echo "Done! Open index.html in your browser."
