param([string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $PSScriptRoot ('../backups/' + (Get-Date -Format 'yyyyMMdd-HHmmss')) }
New-Item -ItemType Directory -Path $OutputDirectory -ErrorAction Stop | Out-Null
$backupTarget = (Resolve-Path -LiteralPath $OutputDirectory).Path
# Stop writers gracefully so database and filesystem represent one recoverable checkpoint.
try {
    docker compose stop --timeout 45 api worker
    if ($LASTEXITCODE -ne 0) { throw 'Could not stop writers' }
    docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/academy-checkpoint.dump'
    if ($LASTEXITCODE -ne 0) { throw 'Database backup failed' }
    docker compose cp db:/tmp/academy-checkpoint.dump (Join-Path $backupTarget 'database.dump')
    if ($LASTEXITCODE -ne 0) { throw 'Database backup copy failed' }
    docker compose cp api:/app/media (Join-Path $backupTarget 'media')
    if ($LASTEXITCODE -ne 0) { throw 'Storage backup copy failed' }
    Get-ChildItem -LiteralPath $backupTarget -File -Recurse | ForEach-Object { [pscustomobject]@{ RelativePath = [IO.Path]::GetRelativePath($backupTarget, $_.FullName); Hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash } } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $backupTarget 'checksums.json')
    Write-Output ('Checkpoint saved at ' + $backupTarget)
} finally {
    docker compose start api worker
}
