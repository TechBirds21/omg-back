# Update frontend .env with correct Supabase credentials

$envFile = "..\.env"
$newSupabaseUrl = "https://sqmkdczbkfmgdlbotdtf.supabase.co"
$newSupabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbWtkY3pia2ZtZ2RsYm90ZHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNjQ5OTUsImV4cCI6MjA3ODk0MDk5NX0.kvrgdCTcMqWLGkomIb9PR4k44SY6PgSfF28AOsQnyoY"

Write-Host "Updating frontend .env file..." -ForegroundColor Cyan

if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    $updated = $false
    
    # Update SUPABASE_URL
    if ($content -match "VITE_SUPABASE_URL=(.+)") {
        $content = $content -replace "VITE_SUPABASE_URL=.+", "VITE_SUPABASE_URL=$newSupabaseUrl"
        $updated = $true
    } else {
        $content += "`nVITE_SUPABASE_URL=$newSupabaseUrl`n"
        $updated = $true
    }
    
    # Update SUPABASE_KEY
    if ($content -match "VITE_SUPABASE_ANON_KEY=(.+)") {
        $content = $content -replace "VITE_SUPABASE_ANON_KEY=.+", "VITE_SUPABASE_ANON_KEY=$newSupabaseKey"
        $updated = $true
    } else {
        $content += "VITE_SUPABASE_ANON_KEY=$newSupabaseKey`n"
        $updated = $true
    }
    
    # Ensure API URL is set
    if ($content -notmatch "VITE_API_URL") {
        $content += "VITE_API_URL=http://localhost:8000`n"
    }
    
    Set-Content -Path $envFile -Value $content -NoNewline
    Write-Host "✅ Updated frontend .env file" -ForegroundColor Green
} else {
    # Create new .env file
    $content = @"
VITE_SUPABASE_URL=$newSupabaseUrl
VITE_SUPABASE_ANON_KEY=$newSupabaseKey
VITE_API_URL=http://localhost:8000
"@
    Set-Content -Path $envFile -Value $content
    Write-Host "✅ Created frontend .env file" -ForegroundColor Green
}

Write-Host "`nUpdated values:" -ForegroundColor Cyan
Write-Host "  VITE_SUPABASE_URL=$newSupabaseUrl" -ForegroundColor White
Write-Host "  VITE_SUPABASE_ANON_KEY=$($newSupabaseKey.Substring(0,50))..." -ForegroundColor White
Write-Host "`n⚠️  Restart frontend dev server for changes to take effect!" -ForegroundColor Yellow

