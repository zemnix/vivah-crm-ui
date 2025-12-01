$ErrorActionPreference = "Continue"
npm run build 2>&1 | Tee-Object -FilePath "build-errors.txt"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Check build-errors.txt for details."
    Get-Content "build-errors.txt"
    exit 1
} else {
    Write-Host "Build succeeded!"
    exit 0
}

