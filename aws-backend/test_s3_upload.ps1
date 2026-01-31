# S3 Upload Integration Test Script (PowerShell)
# Run this after starting the backend server

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "S3 Upload Integration Test" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BaseUrl = "http://localhost:5001"
$StlFile = "test_design.stl"

# Step 1: Check if server is running
Write-Host "1. Checking if server is running..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method Get -ErrorAction Stop
    Write-Host "   ✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Server is not running. Start with: node server.js" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Get JWT token
Write-Host "2. Authentication" -ForegroundColor Yellow
Write-Host "   Please login first if you haven't:" -ForegroundColor Gray
Write-Host "   POST $BaseUrl/api/auth/login" -ForegroundColor Gray
Write-Host ""
$JwtToken = Read-Host "   Enter your JWT token"
Write-Host ""

# Step 3: Create test STL file if doesn't exist
if (-not (Test-Path $StlFile)) {
    Write-Host "3. Creating test STL file..." -ForegroundColor Yellow
    $stlContent = @"
solid test
  facet normal 0 0 0
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 0 1 0
    endloop
  endfacet
endsolid test
"@
    $stlContent | Out-File -FilePath $StlFile -Encoding ASCII
    Write-Host "   ✅ Test STL file created: $StlFile" -ForegroundColor Green
    Write-Host ""
}

# Step 4: Upload STL file
Write-Host "4. Uploading STL file to S3..." -ForegroundColor Yellow
Write-Host "   File: $StlFile" -ForegroundColor Gray
Write-Host "   Endpoint: POST $BaseUrl/api/designs/upload" -ForegroundColor Gray
Write-Host ""

try {
    # Prepare multipart form data
    $filePath = Join-Path (Get-Location) $StlFile
    $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
    $fileContent = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($fileBytes)
    
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $bodyLines = (
        "--$boundary",
        "Content-Disposition: form-data; name=`"stl_file`"; filename=`"$StlFile`"",
        "Content-Type: application/octet-stream$LF",
        $fileContent,
        "--$boundary--$LF"
    ) -join $LF
    
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/designs/upload" `
        -Method Post `
        -Headers @{
            "Authorization" = "Bearer $JwtToken"
        } `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $bodyLines
    
    Write-Host "✅ UPLOAD SUCCESSFUL" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5
    Write-Host ""
    
    $designId = $response.data.design.id
    
    if ($designId) {
        # Step 5: Fetch the uploaded design
        Write-Host "5. Fetching uploaded design (ID: $designId)..." -ForegroundColor Yellow
        $design = Invoke-RestMethod -Uri "$BaseUrl/api/designs/$designId" `
            -Method Get `
            -Headers @{ "Authorization" = "Bearer $JwtToken" }
        
        Write-Host "Design Details:" -ForegroundColor Cyan
        $design | ConvertTo-Json -Depth 5
        Write-Host ""
        
        # Step 6: List all designs
        Write-Host "6. Listing all user designs..." -ForegroundColor Yellow
        $allDesigns = Invoke-RestMethod -Uri "$BaseUrl/api/designs" `
            -Method Get `
            -Headers @{ "Authorization" = "Bearer $JwtToken" }
        
        Write-Host "All Designs:" -ForegroundColor Cyan
        $allDesigns | ConvertTo-Json -Depth 5
        Write-Host ""
    }
    
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "✅ S3 INTEGRATION TEST PASSED" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Verify file in S3 bucket: robohatch-stl-uploads" -ForegroundColor Gray
    Write-Host "2. Check folder structure: stl-designs/USER_ID/UUID.stl" -ForegroundColor Gray
    Write-Host "3. Confirm bucket is private" -ForegroundColor Gray
    Write-Host "4. Verify DB record in custom_designs table" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    Write-Host "❌ UPLOAD FAILED" -ForegroundColor Red
    Write-Host "   HTTP Status: $statusCode" -ForegroundColor Red
    
    if ($statusCode -eq 401) {
        Write-Host "   Error: Authentication failed" -ForegroundColor Red
        Write-Host "   Please provide a valid JWT token" -ForegroundColor Yellow
    } elseif ($statusCode -eq 400) {
        Write-Host "   Error: Validation failed" -ForegroundColor Red
        Write-Host "   Check file format and size" -ForegroundColor Yellow
    } else {
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Server response:" -ForegroundColor Gray
    Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
}

Write-Host ""
