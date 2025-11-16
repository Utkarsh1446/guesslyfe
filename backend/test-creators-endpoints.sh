#!/bin/bash

# Creators Module Endpoint Testing Script
# This script tests all 4 new Creator endpoints

BASE_URL="http://localhost:3000"
TEST_CREATOR_ADDRESS="0x9F4c1f7EAA0b729b798F81BE84B25fDf9F66A0bf"

echo "========================================="
echo "Creators Module Endpoint Tests"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Note: These tests assume the backend server is running on $BASE_URL${NC}"
echo ""

# Test 1: Check Eligibility
echo "1. Testing POST /creators/check-eligibility"
echo "   Checking eligibility for test user..."
response=$(curl -s -X POST "$BASE_URL/creators/check-eligibility" \
  -H "Content-Type: application/json" \
  -d '{"twitterHandle": "test"}' \
  -w "\nHTTP_STATUS:%{http_code}")

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

if [ "$http_status" = "200" ] || [ "$http_status" = "404" ]; then
  echo -e "   ${GREEN}✓ Endpoint accessible (Status: $http_status)${NC}"
  echo "   Response: $body" | head -3
else
  echo -e "   ${RED}✗ Unexpected status: $http_status${NC}"
fi
echo ""

# Test 2: Volume Progress
echo "2. Testing GET /creators/address/:address/volume-progress"
echo "   Getting volume progress for $TEST_CREATOR_ADDRESS..."
response=$(curl -s -X GET "$BASE_URL/creators/address/$TEST_CREATOR_ADDRESS/volume-progress" \
  -w "\nHTTP_STATUS:%{http_code}")

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

if [ "$http_status" = "200" ] || [ "$http_status" = "404" ]; then
  echo -e "   ${GREEN}✓ Endpoint accessible (Status: $http_status)${NC}"
  echo "   Response: $body" | head -3
else
  echo -e "   ${RED}✗ Unexpected status: $http_status${NC}"
fi
echo ""

# Test 3: Create Shares (without auth - should fail)
echo "3. Testing POST /creators/address/:address/create-shares"
echo "   Attempting to create shares without authentication..."
response=$(curl -s -X POST "$BASE_URL/creators/address/$TEST_CREATOR_ADDRESS/create-shares" \
  -w "\nHTTP_STATUS:%{http_code}")

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

if [ "$http_status" = "401" ] || [ "$http_status" = "403" ]; then
  echo -e "   ${GREEN}✓ Endpoint protected (Status: $http_status - Expected)${NC}"
  echo "   Response: $body" | head -3
else
  echo -e "   ${YELLOW}! Unexpected status: $http_status (Expected 401/403)${NC}"
fi
echo ""

# Test 4: Performance
echo "4. Testing GET /creators/address/:address/performance"
echo "   Getting performance metrics for $TEST_CREATOR_ADDRESS..."
response=$(curl -s -X GET "$BASE_URL/creators/address/$TEST_CREATOR_ADDRESS/performance" \
  -w "\nHTTP_STATUS:%{http_code}")

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

if [ "$http_status" = "200" ] || [ "$http_status" = "404" ]; then
  echo -e "   ${GREEN}✓ Endpoint accessible (Status: $http_status)${NC}"
  echo "   Response: $body" | head -3
else
  echo -e "   ${RED}✗ Unexpected status: $http_status${NC}"
fi
echo ""

echo "========================================="
echo "Test Summary"
echo "========================================="
echo ""
echo "All 4 Creator endpoints have been tested:"
echo "  1. POST /creators/check-eligibility - Eligibility checking"
echo "  2. GET  /creators/address/:address/volume-progress - Volume tracking"
echo "  3. POST /creators/address/:address/create-shares - Share deployment (protected)"
echo "  4. GET  /creators/address/:address/performance - Performance metrics"
echo ""
echo -e "${YELLOW}Note: Full functionality testing requires:${NC}"
echo "  - Backend server running with database connection"
echo "  - Test data (users, creators, markets) populated"
echo "  - Smart contracts deployed on Base Sepolia"
echo ""
echo "See CREATORS_MODULE_TEST.md for detailed testing guide"
