#!/bin/bash
# Script to restart Next.js dev server with cache clearing

echo "Clearing Next.js cache..."
rm -rf .next

echo "Starting dev server..."
npm run dev
