#!/bin/bash
# S3 Upload Integration Test Script
# Run this after starting the backend server

echo "============================================"
echo "S3 Upload Integration Test"
echo "============================================"
echo ""

# Configuration
BASE_URL="http://localhost:5001"
STL_FILE="test_design.stl"

# Step 1: Check if server is running
echo "1. Checking if server is running..."
curl -s "${BASE_URL}/api/health" > /dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ Server is running"
else
    echo "   ❌ Server is not running. Start with: node server.js"
    exit 1
fi
echo ""

# Step 2: Login to get JWT token
echo "2. Logging in to get JWT token..."
echo "   Email: user@example.com"
echo "   (Create user first if doesn't exist)"
echo ""
read -p "   Enter your JWT token: " JWT_TOKEN
echo ""

# Step 3: Upload STL file
echo "3. Uploading STL file..."
echo "   File: ${STL_FILE}"
echo ""

if [ ! -f "${STL_FILE}" ]; then
    echo "   ⚠️  Test file not found. Creating dummy STL file..."
    # Create a minimal STL file for testing
    cat > ${STL_FILE} << 'EOF'
solid test
  facet normal 0 0 0
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 0 1 0
    endloop
  endfacet
endsolid test
EOF
    echo "   ✅ Dummy STL file created"
fi

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/designs/upload" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -F "stl_file=@${STL_FILE}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "   HTTP Status: ${HTTP_CODE}"
echo ""

# Step 4: Validate response
if [ "$HTTP_CODE" -eq 201 ]; then
    echo "✅ UPLOAD SUCCESSFUL"
    echo ""
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""
    
    # Extract design ID if possible
    DESIGN_ID=$(echo "$BODY" | jq -r '.data.design.id' 2>/dev/null)
    
    if [ ! -z "$DESIGN_ID" ] && [ "$DESIGN_ID" != "null" ]; then
        echo "Design ID: ${DESIGN_ID}"
        echo ""
        
        # Step 5: Verify design was saved
        echo "4. Fetching uploaded design..."
        curl -s -X GET "${BASE_URL}/api/designs/${DESIGN_ID}" \
          -H "Authorization: Bearer ${JWT_TOKEN}" | jq '.'
        echo ""
        
        # Step 6: List all designs
        echo "5. Listing all user designs..."
        curl -s -X GET "${BASE_URL}/api/designs" \
          -H "Authorization: Bearer ${JWT_TOKEN}" | jq '.'
        echo ""
    fi
    
    echo "============================================"
    echo "✅ S3 INTEGRATION TEST PASSED"
    echo "============================================"
    echo ""
    echo "Next steps:"
    echo "1. Check S3 bucket: robohatch-stl-uploads"
    echo "2. Verify file exists at: stl-designs/USER_ID/UUID.stl"
    echo "3. Confirm bucket is private (no public access)"
    echo ""
    
elif [ "$HTTP_CODE" -eq 401 ]; then
    echo "❌ AUTHENTICATION FAILED"
    echo "   Please provide a valid JWT token"
    echo "   Login first: POST ${BASE_URL}/api/auth/login"
    
elif [ "$HTTP_CODE" -eq 400 ]; then
    echo "❌ VALIDATION ERROR"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    
else
    echo "❌ UPLOAD FAILED"
    echo "   HTTP Status: ${HTTP_CODE}"
    echo "   Response: $BODY"
fi

echo ""
