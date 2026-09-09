#!/bin/bash
# Build with e2e jar address override (scripts/verify-receipt.mjs expects this build).
# Production builds (npm run build / CI) use the PENDING_S0_KEYGEN fallback instead.
cd "$(dirname "$0")/.."
VITE_JAR_ADDRESS="4wBqpZM9xaSheZzJSMawUKKwhdpChKbZ5eu5ky4Vigw" npx vite build
