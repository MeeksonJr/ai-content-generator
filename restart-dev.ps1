# PowerShell script to clean and restart Next.js dev server
Write-Host "Stopping any running Next.js processes..." -ForegroundColor Cyan

# Kill any existing Next.js processes
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*next*" -or $_.CommandLine -like "*next*" } | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Cleaning .next directory..." -ForegroundColor Cyan
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host ".next directory removed" -ForegroundColor Green
} else {
    Write-Host ".next directory not found (already clean)" -ForegroundColor Yellow
}

Write-Host "`nStarting Next.js dev server..." -ForegroundColor Cyan
Write-Host "Make sure your .env.local file has the correct NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Yellow
Write-Host "`nPress Ctrl+C to stop the server`n" -ForegroundColor Gray

pnpm run dev

