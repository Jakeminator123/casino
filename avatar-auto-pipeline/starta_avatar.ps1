param(
    [Parameter(Position = 0)]
    [string]$Name,
    [switch]$DryRun,
    [int]$Samples = 24,
    [int]$FromStep = 1,
    [int]$OnlyStep = 0,
    [switch]$NoVideo,
    [switch]$RefsOnly
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Stäng av QuickEdit i klassiska konsolfönster så ett musklick i fönstret aldrig fryser körningen.
try {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class ConsoleQuickEdit {
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr GetStdHandle(int nStdHandle);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);
    public static void Disable() {
        IntPtr h = GetStdHandle(-10);
        uint mode;
        if (GetConsoleMode(h, out mode)) {
            mode &= ~0x0040u; // ENABLE_QUICK_EDIT_MODE
            mode |= 0x0080u;  // ENABLE_EXTENDED_FLAGS
            SetConsoleMode(h, mode);
        }
    }
}
"@ -ErrorAction SilentlyContinue
    [ConsoleQuickEdit]::Disable()
} catch {}

$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Here

$Python = Join-Path $Here ".venv\Scripts\python.exe"
if (-not (Test-Path $Python)) {
    Write-Host "FEL: Python-miljön .venv saknas på $Python" -ForegroundColor Red
    exit 1
}

$InputRoot = Join-Path $Here "input"
if (-not (Test-Path $InputRoot)) {
    New-Item -ItemType Directory -Path $InputRoot | Out-Null
}

$Folders = @(Get-ChildItem -Path $InputRoot -Directory | Sort-Object Name)
if (-not $Name) {
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "  AVATAR AUTO-PIPELINE" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    if ($Folders.Count -eq 0) {
        Write-Host "Inga mappar finns under input\ ännu." -ForegroundColor Yellow
        Write-Host "Skapa t.ex. input\rosalina och lägg in 1 till 8 foton."
        exit 1
    }
    Write-Host "Tillgängliga mappar i input\:"
    foreach ($f in $Folders) {
        $imgs = @(Get-ChildItem -Path $f.FullName -File | Where-Object { $_.Extension -match '^\.(jpg|jpeg|png|webp)$' })
        Write-Host ("  - {0} ({1} bilder)" -f $f.Name, $imgs.Count)
    }
    $DefaultName = $Folders[0].Name
    $Entered = Read-Host "Vilken mapp under input\ vill du köra? [Enter = $DefaultName]"
    $Name = if ([string]::IsNullOrWhiteSpace($Entered)) { $DefaultName } else { $Entered.Trim() }
}

$PhotoDir = Join-Path $InputRoot $Name
if (-not (Test-Path $PhotoDir)) {
    Write-Host "FEL: Mappen $PhotoDir finns inte." -ForegroundColor Red
    exit 1
}

$Photos = @(Get-ChildItem -Path $PhotoDir -File | Where-Object { $_.Extension -match '^\.(jpg|jpeg|png|webp)$' } | Sort-Object Name)
if ($Photos.Count -lt 1 -or $Photos.Count -gt 8) {
    Write-Host ("FEL: Hittade {0} bilder i {1}. Det ska ligga 1 till 8 foton där." -f $Photos.Count, $PhotoDir) -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host ("Vald avatar: {0}" -f $Name) -ForegroundColor Green
Write-Host ("Foton ({0} st): {1}" -f $Photos.Count, (($Photos | ForEach-Object { $_.Name }) -join ", "))

function Test-ApiKey {
    param([string]$VarName)
    $envVal = [Environment]::GetEnvironmentVariable($VarName)
    if (-not [string]::IsNullOrWhiteSpace($envVal)) { return $true }
    foreach ($fn in @(".env", ".env.local")) {
        $p = Join-Path $Here $fn
        if (Test-Path $p) {
            foreach ($line in (Get-Content -Path $p -Encoding UTF8)) {
                $t = $line.Trim()
                if ($t -match ("^" + [regex]::Escape($VarName) + "\s*=\s*(.+)$")) {
                    $v = $Matches[1].Trim().Trim('"').Trim("'")
                    if (-not [string]::IsNullOrWhiteSpace($v)) { return $true }
                }
            }
        }
    }
    return $false
}

$MissingKeys = @()
foreach ($k in @("OPENAI_API_KEY", "MESHY_API_KEY")) {
    if (-not (Test-ApiKey $k)) {
        $MissingKeys += $k
    }
}

$EnvFile = Join-Path $Here ".env"
if ($MissingKeys.Count -gt 0 -and -not $DryRun) {
    Write-Host ""
    Write-Host "OBS: Följande API-nycklar saknas:" -ForegroundColor Yellow
    foreach ($k in $MissingKeys) {
        Write-Host ("  - {0}" -f $k) -ForegroundColor Yellow
    }
    Write-Host ("Lägg in dem i filen: {0}" -f $EnvFile) -ForegroundColor Yellow
    Write-Host "(Du kan kopiera .env.example till .env och fylla i värdena, eller sätta miljövariabler.)"
    Write-Host ""
    $ans = Read-Host "Vill du köra en gratis torrkörning (--dry-run) istället? [J/n]"
    if ([string]::IsNullOrWhiteSpace($ans) -or $ans.Trim().ToLower() -in @("j", "ja", "y", "yes")) {
        $DryRun = $true
    } else {
        Write-Host "Avbrutet. Lägg in nycklarna i .env och starta igen." -ForegroundColor Red
        exit 1
    }
}

$OutDir = Join-Path $Here ("output\" + $Name)
$PyArgs = @("-B", (Join-Path $Here "auto_avatar.py"), "--name", $Name, "--out", $OutDir, "--samples", "$Samples", "--photos")
foreach ($p in $Photos) {
    $PyArgs += $p.FullName
}
if ($DryRun) {
    $PyArgs += "--dry-run"
} else {
    if ($FromStep -gt 1) { $PyArgs += @("--from-step", "$FromStep") }
    if ($OnlyStep -gt 0) { $PyArgs += @("--only-step", "$OnlyStep") }
    if ($NoVideo) { $PyArgs += "--no-video" }
    if ($RefsOnly) { $PyArgs += "--refs-only" }
}

Write-Host ""
Write-Host ("Utmapp: {0}" -f $OutDir)
Write-Host ("Kör: .venv\Scripts\python.exe auto_avatar.py --name {0} ..." -f $Name) -ForegroundColor Cyan
Write-Host ""

& $Python @PyArgs
$rc = $LASTEXITCODE
Write-Host ""
if ($rc -eq 0) {
    Write-Host ("Klart! Se {0}" -f $OutDir) -ForegroundColor Green
} else {
    Write-Host ("Avbröts (felkod {0}). Se loggar i {1}" -f $rc, $OutDir) -ForegroundColor Red
}
if (-not $DryRun -and [Environment]::UserInteractive) {
    Read-Host "Tryck Enter för att stänga"
}
exit $rc
