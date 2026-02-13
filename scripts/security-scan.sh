#!/bin/bash
# Security Scanning Script for Docker Images
# This script performs comprehensive security scanning on Docker images

set -e

IMAGE_NAME="${1:-acrquestionnairedev.azurecr.io/questionnaire-api:latest}"
SCAN_REPORT="security-scan-$(date +%Y%m%d-%H%M%S).json"

echo "===================================="
echo "Docker Security Scan"
echo "===================================="
echo "Image: $IMAGE_NAME"
echo "Timestamp: $(date)"
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed or not in PATH"
    exit 1
fi

# Pull latest image
echo "Pulling latest image..."
docker pull "$IMAGE_NAME" || echo "Warning: Could not pull image, using local version"

# Run Docker Scout scan if available
echo ""
echo "Running Docker Scout vulnerability scan..."
if docker scout version &> /dev/null; then
    docker scout cves "$IMAGE_NAME" --format json --output "$SCAN_REPORT" || echo "Scout scan completed with warnings"
    
    # Display summary
    echo ""
    echo "Scan Summary:"
    docker scout cves "$IMAGE_NAME" --format sarif | grep -E "critical|high|medium" || echo "No high-priority vulnerabilities found"
else
    echo "Docker Scout not available. Install with: docker scout install"
fi

# Check for common security issues
echo ""
echo "Security Configuration Check:"
echo "------------------------------"

# Check if running as root
if docker run --rm --entrypoint /bin/sh "$IMAGE_NAME" -c "id" | grep -q "uid=0"; then
    echo "⚠️  WARNING: Container may be running as root"
else
    echo "✅ Container running as non-root user"
fi

# Check for sensitive files
echo ""
echo "Checking for sensitive files..."
SENSITIVE_FILES=$(docker run --rm --entrypoint /bin/sh "$IMAGE_NAME" -c "find /app -name '*.key' -o -name '*.pem' -o -name '.env' 2>/dev/null" || echo "")
if [ -n "$SENSITIVE_FILES" ]; then
    echo "⚠️  WARNING: Sensitive files found:"
    echo "$SENSITIVE_FILES"
else
    echo "✅ No sensitive files found in image"
fi

# Check npm audit
echo ""
echo "Running npm audit..."
docker run --rm --entrypoint /bin/sh "$IMAGE_NAME" -c "cd /app && npm audit --json" > npm-audit-$(date +%Y%m%d-%H%M%S).json 2>&1 || echo "npm audit completed"

echo ""
echo "===================================="
echo "Scan Complete"
echo "===================================="
echo "Report saved to: $SCAN_REPORT"
