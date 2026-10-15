param([Parameter(Mandatory=$true)][string]$BackupDirectory)
$ErrorActionPreference = 'Stop'
$restoreSource = (Resolve-Path -LiteralPath $BackupDirectory).Path
$manifest = Get-Content -LiteralPath (Join-Path $restoreSource 'checksums.json') -Raw | ConvertFrom-Json
foreach ($entry in $manifest) {
    $checkedFile = [IO.Path]::GetFullPath((Join-Path $restoreSource $entry.RelativePath))
    if (-not $checkedFile.StartsWith($restoreSource + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid manifest path' }
    if ((Get-FileHash -LiteralPath $checkedFile -Algorithm SHA256).Hash -ne $entry.Hash) { throw 'Backup checksum mismatch' }
}
$verifySuffix = [Guid]::NewGuid().ToString('N').Substring(0,12)
$verifyDb = 'academy_restore_' + $verifySuffix
$verifyVolume = 'academy_restore_' + $verifySuffix
if ($verifyDb -notmatch '^academy_restore_[a-f0-9]{12}$') { throw 'Invalid disposable database name' }
$createdDb = $false
$createdVolume = $false
try {
    docker compose cp (Join-Path $restoreSource 'database.dump') db:/tmp/academy-restore-check.dump
    if ($LASTEXITCODE -ne 0) { throw 'Could not copy dump' }
    docker compose exec -T db sh -c 'createdb -U "$POSTGRES_USER" "$1"' verify $verifyDb
    if ($LASTEXITCODE -ne 0) { throw 'Could not create disposable database' }
    $createdDb = $true
    docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$1" --no-owner --no-acl --exit-on-error /tmp/academy-restore-check.dump' verify $verifyDb
    if ($LASTEXITCODE -ne 0) { throw 'Restore failed' }
    docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$1" -v ON_ERROR_STOP=1 -c "SELECT count(*) AS restored_migrations FROM public.schema_migrations;"' verify $verifyDb
    if ($LASTEXITCODE -ne 0) { throw 'Restored schema verification failed' }
    $existingVolume = docker volume ls --filter ('name=^' + $verifyVolume + '$') --format '{{.Name}}'
    if ($existingVolume) { throw 'Disposable volume already exists' }
    docker volume create --label academy.backup-verification=true $verifyVolume | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Could not create disposable volume' }
    $createdVolume = $true
    $mediaCheckpoint = (Resolve-Path -LiteralPath (Join-Path $restoreSource 'media')).Path
    $verifyCode = 'const fs=require("fs"),p=require("path"),crypto=require("crypto");fs.cpSync("/backup","/app/media",{recursive:true});let n=0;function check(dir){for(const f of fs.readdirSync(p.join("/backup",dir),{withFileTypes:true})){const rel=p.join(dir,f.name);if(f.isDirectory())check(rel);else{const hash=x=>crypto.createHash("sha256").update(fs.readFileSync(x)).digest("hex");if(hash(p.join("/backup",rel))!==hash(p.join("/app/media",rel)))throw Error("Storage checksum mismatch");n++;}}}check("");console.log("Restored media files verified: "+n);'
    docker run --rm --network none --read-only --cap-drop ALL --memory 512m --pids-limit 32 --mount ('type=volume,source=' + $verifyVolume + ',target=/app/media') --mount ('type=bind,source=' + $mediaCheckpoint + ',target=/backup,readonly') backend-api node -e $verifyCode
    if ($LASTEXITCODE -ne 0) { throw 'Restored media verification failed' }
    Write-Output 'Backup restore rehearsal passed; source database and media were not modified.'
} finally {
    if ($createdDb) { docker compose exec -T db sh -c 'dropdb -U "$POSTGRES_USER" "$1"' verify $verifyDb }
    if ($createdVolume) { docker volume rm $verifyVolume | Out-Null }
}
