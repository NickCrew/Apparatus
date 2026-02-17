#!/bin/bash
set -e

echo "📦 Bundling Escape Artist with esbuild (CJS)..."
npx esbuild src/escape/index.ts --bundle --platform=node --target=node18 --outfile=dist/escape.js --format=cjs --external:node:sqlite

mkdir -p dist/bin

echo "📜 Creating Wrapper Script..."
cat <<EOF > dist/bin/escape
#!/usr/bin/env node
require('../escape.js');
EOF

chmod +x dist/bin/escape

echo "✅ Done! Runnable script at dist/bin/escape"
echo "   (Requires Node.js installed on target system)"
ls -lh dist/bin/escape
