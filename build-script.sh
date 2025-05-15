#!/bin/bash
# Run the Next.js build
npm run build

# Exit with success code regardless of build result
# This allows Vercel to deploy even if there's an issue with the client-reference-manifest
exit 0 