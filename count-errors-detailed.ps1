$ErrorActionPreference = 'Continue'
Write-Host "`nRunning TypeScript compilation..." -ForegroundColor Cyan
$output = npm run check 2>&1 | Out-String
$errors = ($output | Select-String "error TS" -AllMatches).Matches
$totalErrors = $errors.Count

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Total TypeScript Errors: $totalErrors" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Group by error type
$errorTypes = $errors | ForEach-Object {
    if ($_.Value -match '(error TS\d+)') {
        $matches[1]
    }
} | Group-Object | Sort-Object Count -Descending | Select-Object -First 10

Write-Host "Top 10 Error Types:" -ForegroundColor Cyan
$errorTypes | Format-Table Count, Name -AutoSize

# Group by file
Write-Host "`nTop 20 Files by Error Count:" -ForegroundColor Cyan
$fileErrors = $output -split "`n" | Where-Object { $_ -match "error TS" } | ForEach-Object {
    if ($_ -match "^(.+?)\(\d+,\d+\): error TS") {
        $matches[1]
    }
} | Group-Object | Sort-Object Count -Descending | Select-Object -First 20

$fileErrors | Format-Table Count, Name -AutoSize
