$ErrorActionPreference = 'Continue'
$output = npm run check 2>&1 | Out-String
$errors = ($output | Select-String "error TS" -AllMatches).Matches
$totalErrors = $errors.Count
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TypeScript Error Count: $totalErrors" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Group by error type
$errorTypes = $errors | ForEach-Object {
    if ($_.Value -match '(error TS\d+)') {
        $matches[1]
    }
} | Group-Object | Sort-Object Count -Descending | Select-Object -First 10

Write-Host "Top 10 Error Types:" -ForegroundColor Cyan
$errorTypes | Format-Table Count, Name -AutoSize
