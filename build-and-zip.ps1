# Build and Zip Script for Omaguva Frontend
# Creates two separate zip files: main app and store billing app

Write-Host "`nBuilding Omaguva Frontend Applications..." -ForegroundColor Cyan
Write-Host "`nThis will create:" -ForegroundColor Yellow
Write-Host "   1. frontend-main.zip (for omaguva.com)" -ForegroundColor White
Write-Host "   2. frontend-store.zip (for store.omaguva.com)" -ForegroundColor White

# Clean previous builds
Write-Host "`nCleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "dist-store") { Remove-Item -Recurse -Force "dist-store" }
if (Test-Path "frontend-main.zip") { Remove-Item -Force "frontend-main.zip" }
if (Test-Path "frontend-store.zip") { Remove-Item -Force "frontend-store.zip" }

# Build Store App (this works)
Write-Host "`nBuilding Store Billing App..." -ForegroundColor Yellow
npm run build:store
if ($LASTEXITCODE -ne 0) {
    Write-Host "Store app build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Store app built successfully!" -ForegroundColor Green

# Try to build main app (may fail due to Orders.tsx issue)
Write-Host "`nBuilding Main App..." -ForegroundColor Yellow
$mainBuildSuccess = $false
npm run build 2>&1 | Tee-Object -Variable buildOutput
if ($LASTEXITCODE -eq 0) {
    $mainBuildSuccess = $true
    Write-Host "Main app built successfully!" -ForegroundColor Green
} else {
    Write-Host "Main app build failed (known issue with Orders.tsx)" -ForegroundColor Yellow
    Write-Host "Creating zip with store app only for now..." -ForegroundColor Yellow
}

# Create zip files
Write-Host "`nCreating zip files..." -ForegroundColor Yellow

# Store app zip
if (Test-Path "dist-store") {
    Compress-Archive -Path dist-store/* -DestinationPath frontend-store.zip -Force
    $storeSize = (Get-Item frontend-store.zip).Length / 1MB
    Write-Host "   frontend-store.zip created ($([math]::Round($storeSize, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "   dist-store folder not found!" -ForegroundColor Red
}

# Main app zip
if ($mainBuildSuccess -and (Test-Path "dist")) {
    Compress-Archive -Path dist/* -DestinationPath frontend-main.zip -Force
    $mainSize = (Get-Item frontend-main.zip).Length / 1MB
    Write-Host "   frontend-main.zip created ($([math]::Round($mainSize, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "   frontend-main.zip not created (build failed)" -ForegroundColor Yellow
    Write-Host "      Fix Orders.tsx build issue first" -ForegroundColor Yellow
}

Write-Host "`nBuild process complete!" -ForegroundColor Green
Write-Host "`nSummary:" -ForegroundColor Cyan
if (Test-Path "frontend-store.zip") {
    Write-Host "   frontend-store.zip - Ready for store.omaguva.com" -ForegroundColor Green
}
if (Test-Path "frontend-main.zip") {
    Write-Host "   frontend-main.zip - Ready for omaguva.com" -ForegroundColor Green
} else {
    Write-Host "   frontend-main.zip - Needs build fix" -ForegroundColor Yellow
}
