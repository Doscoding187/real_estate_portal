$ErrorActionPreference = 'Continue'
$output = & npm run check *>&1
$errors = $output | Select-String "error TS"
Write-Host "Total TypeScript Errors: $($errors.Count)"
$errors | Group-Object { $_ -replace '.*?(error TS\d+).*','$1' } | Sort-Object Count -Descending | Select-Object -First 15 Count,Name | Format-Table -AutoSize
