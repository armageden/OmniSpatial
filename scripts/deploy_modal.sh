#!/usr/bin/env bash
# Deploy OmniSpatial Serverless GPU Worker to Modal
# Requires: modal token set up (https://modal.com/)

set -e

echo "🚀 Checking Modal CLI..."
if ! command -v modal &> /dev/null; then
    echo "⚠️ Modal CLI not found in PATH. Using virtual environment modal..."
    export PATH="backend/.venv/bin:$PATH"
fi

echo "📦 Validating Modal App syntax..."
python3 -m py_compile backend/app/services/modal_app.py

echo "🌐 Deploying OmniSpatial to Modal..."
modal deploy backend/app/services/modal_app.py

echo "✅ Modal deployment completed successfully!"
