#!/bin/bash

# VibeCI Artifact Builder
# Creates a submission package with all artifacts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

OUTPUT_DIR="$PROJECT_ROOT/submission"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🏗️  Building VibeCI Submission Package"
echo "======================================="
echo ""

# Create output directory
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Copy source code (excluding node_modules)
echo "📦 Copying source code..."
mkdir -p "$OUTPUT_DIR/source"
rsync -av --exclude='node_modules' --exclude='dist' --exclude='.git' --exclude='artifacts' \
    backend/ "$OUTPUT_DIR/source/backend/"
rsync -av --exclude='node_modules' --exclude='dist' --exclude='.git' \
    frontend/ "$OUTPUT_DIR/source/frontend/"
rsync -av --exclude='node_modules' --exclude='dist' --exclude='.git' \
    demo_repo/ "$OUTPUT_DIR/source/demo_repo/"
cp -r agent_prompts "$OUTPUT_DIR/source/"
cp -r test_runner "$OUTPUT_DIR/source/"
cp -r antigravity "$OUTPUT_DIR/source/"

# Copy documentation
echo "📄 Copying documentation..."
cp README.md "$OUTPUT_DIR/"
cp DEVPOST.md "$OUTPUT_DIR/"
cp docker-compose.yml "$OUTPUT_DIR/source/"
cp package.json "$OUTPUT_DIR/source/"

# Copy artifacts if they exist
if [ -d "artifacts" ]; then
    echo "📊 Copying artifacts..."
    cp -r artifacts "$OUTPUT_DIR/"
fi

# Create manifest
echo "📋 Creating manifest..."
cat > "$OUTPUT_DIR/MANIFEST.md" << EOF
# VibeCI Submission Package

Generated: $(date)

## Contents

- \`README.md\` - Project documentation
- \`DEVPOST.md\` - Devpost submission text
- \`source/\` - Complete source code
  - \`backend/\` - Node.js backend with Gemini integration
  - \`frontend/\` - React frontend
  - \`demo_repo/\` - Demo repository with failing tests
  - \`agent_prompts/\` - AI agent prompts
  - \`test_runner/\` - Docker test runner
  - \`antigravity/\` - Browser verification scripts
- \`artifacts/\` - Generated artifacts from demo runs

## Quick Start

\`\`\`bash
cd source
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd demo_repo && npm install && cd ..

# Set your Gemini API key
export GEMINI_API_KEY=your_key_here

# Start the backend
cd backend && npm run dev &

# Start the frontend (in another terminal)
cd frontend && npm run dev
\`\`\`

Then open http://localhost:5173 in your browser.
EOF

# Create ZIP archive
echo "🗜️  Creating ZIP archive..."
cd "$PROJECT_ROOT"
zip -r "vibeci-submission-$TIMESTAMP.zip" submission/

echo ""
echo "✅ Submission package created!"
echo "   Location: vibeci-submission-$TIMESTAMP.zip"
echo "   Size: $(du -h "vibeci-submission-$TIMESTAMP.zip" | cut -f1)"
