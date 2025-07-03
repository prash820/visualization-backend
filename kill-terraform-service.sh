#!/bin/bash

# Kill Terraform Service Helper Script
# Use this script if you need to manually stop the Terraform service

echo "🔍 Checking for processes on port 8000..."

# Find process using port 8000
PID=$(lsof -ti :8000 2>/dev/null)

if [ -z "$PID" ]; then
    echo "✅ No process found on port 8000"
else
    echo "🔍 Found process $PID on port 8000"
    echo "🛑 Killing process $PID..."
    
    # Try graceful kill first
    kill -TERM $PID 2>/dev/null
    
    # Wait a moment
    sleep 2
    
    # Check if still running
    if kill -0 $PID 2>/dev/null; then
        echo "💀 Process still running, force killing..."
        kill -9 $PID 2>/dev/null
    fi
    
    # Verify it's gone
    sleep 1
    if lsof -ti :8000 >/dev/null 2>&1; then
        echo "❌ Failed to kill process on port 8000"
    else
        echo "✅ Successfully killed Terraform service"
    fi
fi

echo "🔍 Current port 8000 status:"
lsof -i :8000 2>/dev/null || echo "✅ Port 8000 is free" 