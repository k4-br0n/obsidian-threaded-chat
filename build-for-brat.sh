#!/bin/bash

# Build the plugin
echo "Building plugin..."
npx esbuild src/main.ts --bundle --external:obsidian --format=cjs --outfile=main.js

# Create directories if they don't exist
mkdir -p .obsidian/plugins/obsidian-threaded-chat
mkdir -p releases/latest

# Copy files to the plugin directory for local development
echo "Copying files to local plugin directory..."
cp main.js styles.css manifest.json versions.json .obsidian/plugins/obsidian-threaded-chat/

# Copy files to the releases directory for BRAT
echo "Copying files to releases directory..."
cp main.js styles.css manifest.json versions.json releases/latest/

echo "Build completed successfully!"
echo "Plugin files are now ready for both local testing and BRAT." 