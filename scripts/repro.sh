#!/bin/bash

# VibeCI Reproducibility Script
# This script runs the entire demo locally for reproducible results

set -e

echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║   ██╗   ██╗██╗██████╗ ███████╗ ██████╗██╗            ║"
echo "║   ██║   ██║██║██╔══██╗██╔════╝██╔════╝██║            ║"
echo "║   ██║   ██║██║██████╔╝█████╗  ██║     ██║            ║"
echo "║   ╚██╗ ██╔╝██║██╔══██╗██╔══╝  ██║     ██║            ║"
echo "║    ╚████╔╝ ██║██████╔╝███████╗╚██████╗██║            ║"
echo "║     ╚═══╝  ╚═╝╚═════╝ ╚══════╝ ╚═════╝╚═╝            ║"
echo "║                                                       ║"
echo "║   Reproducibility Script                              ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check for required environment variables
if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ Error: GEMINI_API_KEY environment variable is required"
    echo "   Set it with: export GEMINI_API_KEY=your_api_key"
    exit 1
fi

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "📁 Project root: $PROJECT_ROOT"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
echo "─────────────────────────────────────"

echo "Installing root dependencies..."
npm install

echo "Installing demo_repo dependencies..."
cd demo_repo && npm install && cd ..

echo "Installing backend dependencies..."
cd backend && npm install && cd ..

echo "Installing frontend dependencies..."
cd frontend && npm install && cd ..

echo "✅ Dependencies installed"
echo ""

# Step 2: Verify demo_repo tests fail initially
echo "🧪 Step 2: Verifying initial test state (should fail)..."
echo "─────────────────────────────────────"

cd demo_repo
echo "Running tests in demo_repo..."
npm test 2>&1 || echo "✅ Tests failed as expected (signup not implemented)"
cd ..
echo ""

# Step 3: Start the backend
echo "🚀 Step 3: Starting backend server..."
echo "─────────────────────────────────────"

cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 5

# Check if backend is running
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend running at http://localhost:3001"
else
    echo "❌ Backend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi
echo ""

# Step 4: Submit a demo task
echo "📋 Step 4: Submitting demo task..."
echo "─────────────────────────────────────"

TASK_RESPONSE=$(curl -s -X POST http://localhost:3001/api/tasks \
    -H "Content-Type: application/json" \
    -d '{"description": "Add email-based signup to the authentication service using the existing User model. Provide unit tests and ensure rate-limiting for signup attempts.", "maxIterations": 3}')

TASK_ID=$(echo $TASK_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TASK_ID" ]; then
    echo "✅ Task created: $TASK_ID"
else
    echo "❌ Failed to create task"
    echo "Response: $TASK_RESPONSE"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi
echo ""

# Step 5: Monitor task progress
echo "⏳ Step 5: Monitoring task progress..."
echo "─────────────────────────────────────"

MAX_WAIT=300  # 5 minutes max
WAITED=0

while [ $WAITED -lt $MAX_WAIT ]; do
    STATUS_RESPONSE=$(curl -s http://localhost:3001/api/tasks/$TASK_ID)
    STATUS=$(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    ITERATION=$(echo $STATUS_RESPONSE | grep -o '"currentIteration":[0-9]*' | cut -d':' -f2)
    
    echo "   Status: $STATUS (Iteration $ITERATION)"
    
    if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
        break
    fi
    
    sleep 10
    WAITED=$((WAITED + 10))
done

echo ""

# Step 6: Collect results
echo "📊 Step 6: Collecting results..."
echo "─────────────────────────────────────"

# Get events
EVENTS_RESPONSE=$(curl -s http://localhost:3001/api/tasks/$TASK_ID/events)
EVENT_COUNT=$(echo $EVENTS_RESPONSE | grep -o '"id"' | wc -l)
echo "   Total events: $EVENT_COUNT"

# Get artifacts
ARTIFACTS_RESPONSE=$(curl -s http://localhost:3001/api/tasks/$TASK_ID/artifacts)
ARTIFACT_COUNT=$(echo $ARTIFACTS_RESPONSE | grep -o '"id"' | wc -l)
echo "   Total artifacts: $ARTIFACT_COUNT"

# Get final status
FINAL_STATUS=$(curl -s http://localhost:3001/api/tasks/$TASK_ID | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
echo "   Final status: $FINAL_STATUS"
echo ""

# Step 7: Summary
echo "═══════════════════════════════════════════════════════"
echo "                    DEMO SUMMARY                        "
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Task ID: $TASK_ID"
echo "Status:  $FINAL_STATUS"
echo "Events:  $EVENT_COUNT"
echo "Artifacts: $ARTIFACT_COUNT"
echo ""

if [ "$FINAL_STATUS" = "completed" ]; then
    echo "✅ SUCCESS: Task completed successfully!"
    echo ""
    echo "The autonomous agent has:"
    echo "  • Analyzed the codebase"
    echo "  • Generated a plan"
    echo "  • Created code patches"
    echo "  • Fixed failing tests"
    echo "  • Produced verification artifacts"
else
    echo "⚠️  Task did not complete successfully"
    echo "Check the artifacts for debugging information"
fi

echo ""
echo "Artifacts are available at: ./artifacts/$TASK_ID/"
echo ""

# Cleanup
echo "🧹 Cleaning up..."
kill $BACKEND_PID 2>/dev/null

echo ""
echo "Done! Check the artifacts directory for results."
