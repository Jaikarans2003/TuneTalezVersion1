#!/bin/bash

# Exit on error
set -e

echo "🔥 Starting deployment to Firebase Hosting..."

# Build the Next.js app
echo "📦 Building Next.js application..."
npm run build

# Deploy to Firebase
echo "🚀 Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo "✅ Deployment complete!"
