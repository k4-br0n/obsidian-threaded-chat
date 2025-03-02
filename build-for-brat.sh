#!/bin/bash

# Build the plugin
echo "Building plugin..."
npx esbuild src/main.ts --bundle --external:obsidian --format=cjs --outfile=main.js

# Create plugin directory if it doesn't exist
mkdir -p .obsidian/plugins/obsidian-threaded-chat

# Copy files to the plugin directory
echo "Copying files to plugin directory..."
cp main.js styles.css manifest.json versions.json .obsidian/plugins/obsidian-threaded-chat/

echo "Build completed successfully!"
echo "Plugin files are now ready for BRAT testing." 